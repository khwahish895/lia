import { GoogleGenAI, Type, FunctionDeclaration, Modality } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const searchWebTool: FunctionDeclaration = {
  name: "searchWeb",
  parameters: {
    type: Type.OBJECT,
    description: "Search the web for real-time information, news, or facts.",
    properties: {
      query: {
        type: Type.STRING,
        description: "The search query to look up on the internet.",
      },
    },
    required: ["query"],
  },
};

const getWeatherTool: FunctionDeclaration = {
  name: "getWeather",
  parameters: {
    type: Type.OBJECT,
    description: "Get the current weather for a specific location.",
    properties: {
      location: {
        type: Type.STRING,
        description: "The city and country, e.g., 'London, UK'.",
      },
    },
    required: ["location"],
  },
};

const setReminderTool: FunctionDeclaration = {
  name: "setReminder",
  parameters: {
    type: Type.OBJECT,
    description: "Set a reminder for the user.",
    properties: {
      text: {
        type: Type.STRING,
        description: "What the reminder is about.",
      },
      time: {
        type: Type.STRING,
        description: "When to remind the user (e.g., 'in 5 minutes', 'at 5 PM').",
      },
    },
    required: ["text", "time"],
  },
};

const openAppTool: FunctionDeclaration = {
  name: "openApp",
  parameters: {
    type: Type.OBJECT,
    description: "Open a specific application or website for the user.",
    properties: {
      appName: {
        type: Type.STRING,
        description: "The name of the app or website to open (e.g., 'Instagram', 'YouTube', 'Google').",
      },
      url: {
        type: Type.STRING,
        description: "The direct URL to open if known, otherwise the assistant will determine it.",
      },
    },
    required: ["appName"],
  },
};

export const tools = [
  { functionDeclarations: [searchWebTool, getWeatherTool, setReminderTool, openAppTool] }
];

const homeControlTool: FunctionDeclaration = {
  name: "controlHome",
  parameters: {
    type: Type.OBJECT,
    description: "Control smart home devices like lights, thermostat, or security.",
    properties: {
      device: {
        type: Type.STRING,
        description: "The device to control (e.g., 'living room lights', 'AC', 'front door').",
      },
      action: {
        type: Type.STRING,
        description: "The action to perform (e.g., 'turn on', 'set to 22 degrees', 'lock').",
      },
    },
    required: ["device", "action"],
  },
};

export const advancedTools = [
  { functionDeclarations: [searchWebTool, getWeatherTool, setReminderTool, openAppTool, homeControlTool] }
];

export async function getJarvisResponse(messages: any[], systemInstruction: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  // We use gemini-3.1-pro-preview for advanced reasoning
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: messages,
    config: {
      systemInstruction,
      tools: advancedTools,
    },
  });

  return response;
}

export async function generateSpeech(text: string) {
  if (!GEMINI_API_KEY || !text.trim()) return null;
  
  // Clean text for TTS: remove markdown, extra symbols, and limit length
  const cleanText = text
    .replace(/[*_#`~]/g, '') // Remove markdown symbols
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Replace markdown links with just text
    .replace(/[^\w\s.,!?;:'"-]/g, ' ') // Remove emojis and special characters
    .trim()
    .slice(0, 1000); // Limit length to avoid 500 errors on very long responses

  if (!cleanText) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}
