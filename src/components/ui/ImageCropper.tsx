'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
  minWidth?: number;
  minHeight?: number;
}

export function ImageCropper({
  imageUrl,
  onCropComplete,
  onCancel,
  aspectRatio = 1, // デフォルトは1:1（正方形）
  minWidth = 100,
  minHeight = 100
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // 画像が読み込まれたときに初期クロップを設定
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspectRatio,
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
  }, [aspectRatio]);

  // キャンバスにクロップ結果を描画
  const generateCroppedImage = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // キャンバスサイズを設定
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    // 画像をクロップして描画
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    // Blob に変換
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas is empty'));
          }
        },
        'image/jpeg',
        0.95
      );
    });
  }, [completedCrop]);

  // クロップを確定
  const handleConfirm = async () => {
    const croppedBlob = await generateCroppedImage();
    if (croppedBlob) {
      onCropComplete(croppedBlob);
    }
  };

  // 回転処理
  const handleRotate = () => {
    setRotate((prev) => (prev + 90) % 360);
  };

  // ズーム処理
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        // バックドロップクリックでキャンセル
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">画像を切り抜き</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="90度回転"
            >
              <RotateCw size={20} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="縮小"
            >
              <ZoomOut size={20} />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="拡大"
            >
              <ZoomIn size={20} />
            </button>
          </div>
        </div>

        {/* クロップエリア */}
        <div className="p-4 bg-gray-50 overflow-auto max-h-[60vh]">
          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minWidth={minWidth}
              minHeight={minHeight}
              className="max-w-full"
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  maxHeight: '50vh',
                  maxWidth: '100%',
                  height: 'auto',
                  width: 'auto',
                }}
                onLoad={onImageLoad}
                className="block"
              />
            </ReactCrop>
          </div>
        </div>

        {/* プレビューキャンバス（非表示） */}
        <canvas
          ref={previewCanvasRef}
          style={{ display: 'none' }}
        />

        {/* フッター */}
        <div className="flex justify-between items-center p-4 border-t bg-white">
          <p className="text-sm text-gray-500">
            ドラッグして画像を切り抜いてください（{aspectRatio === 1 ? '1:1' : `${aspectRatio}:1`}）
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X size={16} className="inline mr-1" />
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Check size={16} className="inline mr-1" />
              決定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}