import { useCallback, useRef, useEffect } from 'react';

interface ProcessImageOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  aspectRatio: number;
  removeExif?: boolean;
}

interface ProcessImageRequest {
  imageData: ArrayBuffer;
  fileName: string;
  options: ProcessImageOptions;
}

interface ProcessImageResponse {
  success: boolean;
  processedImage?: ArrayBuffer;
  fileName: string;
  error?: string;
}

interface UseImageWorkerReturn {
  processImages: (files: File[], options: ProcessImageOptions) => Promise<File[]>;
  isWorkerSupported: boolean;
}

export const useImageWorker = (): UseImageWorkerReturn => {
  const workerPool = useRef<Worker[]>([]);
  const availableWorkers = useRef<Worker[]>([]);
  const busyWorkers = useRef<Set<Worker>>(new Set());
  const isWorkerSupported = useRef<boolean>(false);

  // Initialize worker pool on mount
  useEffect(() => {
    // Check if Web Workers are supported
    if (typeof Worker !== 'undefined') {
      try {
        // Try to create a simple test worker
        const testWorker = new Worker(
          new URL('/src/workers/imageProcessor.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        // Test worker creation success
        testWorker.terminate();
        isWorkerSupported.current = true;
        console.log('Image workers enabled - using parallel processing');
        
        // Create worker pool
        const maxWorkers = Math.min(navigator.hardwareConcurrency || 2, 4);
        for (let i = 0; i < maxWorkers; i++) {
          const worker = new Worker(
            new URL('/src/workers/imageProcessor.worker.ts', import.meta.url),
            { type: 'module' }
          );
          
          worker.onerror = (error) => {
            console.warn(`Image worker ${i} error:`, error);
            isWorkerSupported.current = false;
          };
          
          workerPool.current.push(worker);
          availableWorkers.current.push(worker);
        }
      } catch (error) {
        console.warn('Web Workers not supported, using main thread processing:', error);
        isWorkerSupported.current = false;
      }
    } else {
      console.log('Web Workers not available, using main thread processing');
      isWorkerSupported.current = false;
    }

    // Cleanup workers on unmount
    return () => {
      workerPool.current.forEach(worker => {
        worker.terminate();
      });
      workerPool.current = [];
      availableWorkers.current = [];
      busyWorkers.current.clear();
    };
  }, []);

  const getAvailableWorker = useCallback((): Worker | null => {
    if (availableWorkers.current.length === 0) {
      return null;
    }
    
    const worker = availableWorkers.current.pop()!;
    busyWorkers.current.add(worker);
    return worker;
  }, []);

  const releaseWorker = useCallback((worker: Worker) => {
    busyWorkers.current.delete(worker);
    availableWorkers.current.push(worker);
  }, []);

  const processImageWithWorker = useCallback((
    worker: Worker,
    file: File,
    options: ProcessImageOptions
  ): Promise<File> => {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker timeout for ${file.name}`));
      }, 30000); // 30 second timeout

      const handleMessage = (event: MessageEvent<ProcessImageResponse>) => {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        releaseWorker(worker);

        const { success, processedImage, error, fileName } = event.data;

        if (success && processedImage) {
          const processedFile = new File([processedImage], fileName, {
            type: file.type
          });
          resolve(processedFile);
        } else {
          reject(new Error(error || `Processing failed for ${fileName}`));
        }
      };

      const handleError = (error: ErrorEvent) => {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        releaseWorker(worker);
        reject(error);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      try {
        const imageData = await file.arrayBuffer();
        const request: ProcessImageRequest = {
          imageData,
          fileName: file.name,
          options
        };
        
        worker.postMessage(request);
      } catch (error) {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        releaseWorker(worker);
        reject(error);
      }
    });
  }, [releaseWorker]);

  const processImages = useCallback(async (
    files: File[],
    options: ProcessImageOptions
  ): Promise<File[]> => {
    if (!isWorkerSupported.current || workerPool.current.length === 0) {
      // Fallback to main thread processing
      const { processImage } = await import('@/lib/utils/imageUtils');
      return Promise.all(files.map(file => processImage(file, options)));
    }

    // Process files in batches using available workers
    const results: File[] = [];
    const batches: File[][] = [];
    const batchSize = Math.max(1, Math.ceil(files.length / workerPool.current.length));

    // Split files into batches
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    // Process batches in parallel
    const batchPromises = batches.map(async (batch) => {
      const batchResults: File[] = [];
      
      for (const file of batch) {
        // Wait for an available worker
        let worker = getAvailableWorker();
        while (!worker) {
          await new Promise(resolve => setTimeout(resolve, 100));
          worker = getAvailableWorker();
        }

        try {
          const processedFile = await processImageWithWorker(worker, file, options);
          batchResults.push(processedFile);
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error);
          // Fallback to main thread for failed files
          try {
            const { processImage } = await import('@/lib/utils/imageUtils');
            const fallbackFile = await processImage(file, options);
            batchResults.push(fallbackFile);
          } catch (fallbackError) {
            console.error(`Fallback processing failed for ${file.name}:`, fallbackError);
            throw fallbackError;
          }
        }
      }
      
      return batchResults;
    });

    const batchResults = await Promise.all(batchPromises);
    return batchResults.flat();
  }, [getAvailableWorker, processImageWithWorker]);

  return {
    processImages,
    isWorkerSupported: isWorkerSupported.current
  };
};