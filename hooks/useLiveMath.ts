import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { OperationType } from '../types';

interface UseLiveMathProps {
  onOperation: (op: OperationType, value: number) => void;
  onTranscriptUpdate: (text: string) => void;
}

export const useLiveMath = ({ onOperation, onTranscriptUpdate }: UseLiveMathProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const activeRef = useRef(false);

  // Define the tool for the model
  const mathToolDeclaration: FunctionDeclaration = {
    name: 'performMathOperation',
    description: 'Updates the calculator state based on user voice command.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        operation: {
          type: Type.STRING,
          enum: ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'RESET'],
          description: 'The math operation to perform.',
        },
        value: {
          type: Type.NUMBER,
          description: 'The numeric value to apply. For RESET, this can be 0.',
        },
      },
      required: ['operation', 'value'],
    },
  };

  const connect = useCallback(async () => {
    if (activeRef.current) return;
    
    try {
      setIsConnecting(true);
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio
      // Requesting 16kHz explicitly in context, though browser resampling handles it.
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Ensure contexts are running (needed for some browsers that suspend them)
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      // Request audio with preferred constraints for speech
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            setIsConnected(true);
            setIsConnecting(false);
            activeRef.current = true;

            // Start processing audio input
            const source = inputCtx.createMediaStreamSource(stream);
            // Smaller buffer size (2048) for lower latency (~128ms)
            const scriptProcessor = inputCtx.createScriptProcessor(2048, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!activeRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Tool Calls (The Math Logic)
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'performMathOperation') {
                  const args = fc.args as any;
                  // Map string enum to OperationType
                  const opKey = args.operation as keyof typeof OperationType;
                  const opType = OperationType[opKey] || OperationType.UNKNOWN;
                  
                  onOperation(opType, Number(args.value));
                  
                  // Send confirmation back to model
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "ok, state updated" }
                      }
                    });
                  });
                }
              }
            }

            // Handle Transcripts (Visual feedback)
            if (message.serverContent?.inputTranscription) {
               onTranscriptUpdate(message.serverContent.inputTranscription.text);
            }

            // Handle Audio Output (Model speaking back confirmation)
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => {
            console.log('Session closed');
            setIsConnected(false);
            activeRef.current = false;
          },
          onerror: (err) => {
            console.error('Session error', err);
            setError("Connection error occurred.");
            setIsConnected(false);
            activeRef.current = false;
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, 
          tools: [{ functionDeclarations: [mathToolDeclaration] }],
          systemInstruction: `
            You are a super-fast math assistant. 
            
            COMMAND PATTERNS TO SUPPORT:
            1. "Add 50", "Plus 50", "50 plus" -> Operation: ADD, Value: 50
            2. "Subtract 20", "Minus 20", "20 minus", "Take away 20" -> Operation: SUBTRACT, Value: 20
            3. "Times 5", "Multiply by 5", "5 times" -> Operation: MULTIPLY, Value: 5
            4. "Divide by 2", "Over 2", "2 divided by" -> Operation: DIVIDE, Value: 2
            5. "Reset", "Clear", "Start over" -> Operation: RESET, Value: 0
            
            IMPLICIT RULES:
            - If you hear JUST a number (e.g., "Five hundred"), assume it is ADDITION. Call performMathOperation(ADD, 500).
            - Be robust to pauses. "Fifty...... plus" is the same as "Fifty plus".
            
            BEHAVIOR:
            - Call the 'performMathOperation' tool IMMEDIATELY.
            - Keep verbal responses extremely short (e.g., "Added", "Done", "OK", "Two hundred").
            - Do not explain the math. Just do it.
          `,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to microphone or API");
      setIsConnecting(false);
    }
  }, [onOperation, onTranscriptUpdate]);

  const disconnect = useCallback(() => {
    activeRef.current = false;
    
    // Stop microphone
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    
    // Stop speakers
    if (outputAudioContextRef.current) {
      sourcesRef.current.forEach(s => s.stop());
      sourcesRef.current.clear();
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Close session
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  return { connect, disconnect, isConnected, isConnecting, error };
};