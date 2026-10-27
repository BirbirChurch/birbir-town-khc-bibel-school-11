import React, { useState } from 'react';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Student } from '../types.ts';

interface PhotoModalProps {
  student: Student;
  currentPhoto?: string;
  onClose: () => void;
  onSavePhoto: (studentId: string, photoDataUrl: string) => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  student,
  currentPhoto,
  onClose,
  onSavePhoto
}) => {
  const [photoUrl, setPhotoUrl] = useState(currentPhoto || '');
  const [preview, setPreview] = useState(currentPhoto || '');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        setPreview(result);
        setPhotoUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSavePhoto(student.id, photoUrl);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
        <div className="bg-emerald-950 text-white p-4.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">የተማሪ ፎቶ ማያያዣ</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="text-center">
            <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md mb-2 bg-emerald-900 flex items-center justify-center text-white text-3xl font-bold">
              {preview ? (
                <img src={preview} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <span>{student.name.charAt(0)}</span>
              )}
            </div>
            <p className="font-bold text-slate-800 text-sm">{student.name}</p>
            <p className="text-slate-400 text-[11px] font-mono">ID: {student.id}</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ከኮምፒውተር/ስልክ ፎቶ ይምረጡ</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full p-2 border rounded-xl bg-slate-50 border-slate-300 text-[11px] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-800 file:text-white hover:file:bg-emerald-900 cursor-pointer"
            />
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-2 text-slate-400 text-[10px] font-bold">ወይም የፎቶ URL</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div>
            <input
              type="text"
              value={photoUrl.startsWith('data:') ? '' : photoUrl}
              onChange={(e) => {
                setPhotoUrl(e.target.value);
                setPreview(e.target.value);
              }}
              placeholder="https://example.com/photo.jpg"
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-mono text-[11px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold text-slate-700"
            >
              ሰርዝ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs"
            >
              አስቀምጥ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
