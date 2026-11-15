import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import toast from 'react-hot-toast';
import api from '@/services/api';
import Button from './Button';
import Modal from './Modal';

interface ImageUploaderProps {
  // Після успішного завантаження повертає дані файлу з сервера
  onUploaded?: (file: { id: number; originalName: string; path: string }) => void;
}

// Завантаження зображення з попереднім переглядом та обрізанням (рівень 2):
// react-easy-crop для вибору області + canvas-обрізання + upload у файловий
// сервіс серверної частини (POST /api/files/upload, лабораторна робота 2).
export default function ImageUploader({ onUploaded }: ImageUploaderProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null); // URL.createObjectURL
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onFileSelected = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Оберіть файл зображення');
      return;
    }
    setImageSrc(URL.createObjectURL(file));
  };

  const onCropComplete = (_: Area, cropped: Area) => setCroppedArea(cropped);

  // Обрізання через canvas за координатами react-easy-crop
  const createCroppedBlob = async (imageSrc: string, area: Area): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(area.width);
    canvas.height = Math.round(area.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      image,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
  };

  const handleUpload = useCallback(async () => {
    if (!imageSrc || !croppedArea) return;
    setIsUploading(true);
    try {
      const blob = await createCroppedBlob(imageSrc, croppedArea);
      const formData = new FormData();
      formData.append('file', new File([blob], 'product-image.png', { type: 'image/png' }));
      const { data } = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Зображення завантажено (файл #${data.file.id})`);
      onUploaded?.(data.file);
      setImageSrc(null);
    } catch {
      toast.error('Не вдалося завантажити зображення');
    } finally {
      setIsUploading(false);
    }
  }, [imageSrc, croppedArea, onUploaded]);

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
        📷 Обрати зображення (з обрізанням)
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileSelected(e.target.files?.[0])}
        />
      </label>

      <Modal isOpen={imageSrc !== null} onClose={() => setImageSrc(null)} title="Обріжте зображення" size="md">
        <div className="relative h-72 overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
          <Cropper
            image={imageSrc ?? undefined}
            crop={crop}
            zoom={zoom}
            aspect={4 / 3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium">Масштаб</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
            aria-label="Масштаб зображення"
          />
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setImageSrc(null)}>
            Скасувати
          </Button>
          <Button onClick={() => void handleUpload()} isLoading={isUploading}>
            Завантажити
          </Button>
        </div>
      </Modal>
    </div>
  );
}
