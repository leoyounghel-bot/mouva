const apiKey = process.env.Novita_API_KEY || '';

// In production, call Novita API directly. In development, use Vite proxy.
const API_BASE = import.meta.env.PROD 
  ? 'https://api.novita.ai' 
  : '/api/novita';

if (!apiKey) {
    console.error("[Novita Client] ⚠️ Novita_API_KEY is missing! Image generation will fail.");
}

interface GenerateImageParams {
  prompt: string;
  size?: string; // "1024*1024", "512*512", etc.
  seed?: number;
}

interface TaskResponse {
  task_id: string;
}

interface TaskResultResponse {
  task: {
    task_id: string;
    status: "TaskSucceed" | "TaskFailed" | "TaskQueued" | "TaskRunning";
    reason?: string;
  };
  images?: {
    image_url: string;
    image_type: string;
    image_url_ttl: number;
  }[];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateImage = async (params: GenerateImageParams): Promise<string> => {
  const { prompt, size = "512*512", seed = -1 } = params; // Use smaller default size for faster generation

  // Defensive check for undefined/empty prompt
  if (!prompt || prompt.trim() === '') {
    console.error("[Novita Client] ❌ Empty or undefined prompt received!");
    throw new Error("Cannot generate image: prompt is empty or undefined");
  }

  // Check API key
  if (!apiKey) {
    throw new Error("Novita API key is missing. Please set Novita_API_KEY in your .env file.");
  }

  console.log(`[Novita Client] 🖼️ Starting image generation for: "${prompt.substring(0, 50)}..."`);

  try {
    // 1. Initiate Task
    const response = await fetch(`${API_BASE}/v3/async/z-image-turbo-lora`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        size: size,
        seed: seed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Novita Client] ❌ API Error (${response.status}):`, errorText);
      throw new Error(`Novita API Error (${response.status}): ${errorText}`);
    }

    const taskData: TaskResponse = await response.json();
    const taskId = taskData.task_id;
    console.log(`[Novita Client] ✅ Task initiated: ${taskId}`);

    // 2. Poll for Result (with shorter timeout for better UX)
    const maxAttempts = 20; // 20 * 1.5s = 30s max
    const pollInterval = 1500; // 1.5 seconds
    
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      await sleep(pollInterval);

      try {
        const resultResponse = await fetch(`${API_BASE}/v3/async/task-result?task_id=${taskId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          }
        });

        if (!resultResponse.ok) {
          console.warn(`[Novita Client] ⚠️ Polling error: ${resultResponse.status}`);
          continue;
        }

        const resultData: TaskResultResponse = await resultResponse.json();
        const status = resultData.task.status;

        console.log(`[Novita Client] 📊 Polling [${attempts + 1}/${maxAttempts}]: ${status}`);

        // Handle both formats: "TaskSucceed" and "TASK_STATUS_SUCCEED"
        const normalizedStatus = status.toUpperCase();
        
        if (normalizedStatus.includes('SUCCEED') || normalizedStatus.includes('SUCCESS')) {
          if (resultData.images && resultData.images.length > 0) {
            console.log(`[Novita Client] 🎉 Image generated successfully!`);
            return resultData.images[0].image_url;
          } else {
            throw new Error("Task succeeded but no images returned.");
          }
        } else if (normalizedStatus.includes('FAIL')) {
          throw new Error(`Task failed: ${resultData.task.reason || 'Unknown reason'}`);
        }
        // TaskQueued or TaskRunning - continue polling
      } catch (pollError: any) {
        // Network error during polling - continue trying
        console.warn(`[Novita Client] ⚠️ Polling network error:`, pollError.message);
      }
    }

    throw new Error("Image generation timed out after 30 seconds.");

  } catch (error: any) {
    console.error("[Novita Client] ❌ Error:", error.message);
    throw error;
  }
};
