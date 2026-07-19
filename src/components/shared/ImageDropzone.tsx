import { useRef, useState } from 'react';
import { Crop, ImagePlus, Loader2, RotateCw, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function ImageDropzone({ value, contentType, onChange }: { value: string; contentType: 'awareness' | 'story' | 'campaign'; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [crop, setCrop] = useState<'original' | 'square' | 'landscape'>('original');
  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please choose an image file.');
    if (file.size > 10 * 1024 * 1024) return setError('Image must be 10 MB or smaller.');
    setUploading(true); setError('');
    try {
      const { data: signature, error: signatureError } = await supabase.functions.invoke('cloudinary-sign-upload', { body: { contentType } });
      if (signatureError || !signature) throw new Error(signatureError?.message || 'Could not prepare the image upload.');
      if (signature.error) throw new Error(signature.error);
      const body = new FormData();
      body.append('file', file); body.append('api_key', signature.apiKey); body.append('timestamp', String(signature.timestamp)); body.append('folder', signature.folder); body.append('signature', signature.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: 'POST', body });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result?.error?.message || 'Cloudinary upload failed.');
      onChange(result.secure_url);
    } catch (uploadError) {
      const message = (uploadError as Error).message;
      setError(/failed to send a request to the edge function|functionsfetcherror|fetch failed/i.test(message)
        ? 'Image upload service is not deployed. A Supabase project owner must deploy cloudinary-sign-upload before uploads can work.'
        : message);
    }
    finally { setUploading(false); }
  };
  const applyEdits = () => {
    const transforms = [rotation && `a_${rotation}`, brightness && `e_brightness:${brightness}`, contrast && `e_contrast:${contrast}`, saturation && `e_saturation:${saturation}`, crop === 'square' && 'c_fill,ar_1:1,g_auto', crop === 'landscape' && 'c_fill,ar_16:9,g_auto'].filter(Boolean).join('/');
    if (transforms) onChange(value.replace('/upload/', `/upload/${transforms}/`));
    setEditing(false);
  };
  const previewStyle = { filter: `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`, transform: `rotate(${rotation}deg)`, aspectRatio: crop === 'square' ? '1 / 1' : crop === 'landscape' ? '16 / 9' : undefined };
  const adjust = (label: string, value: number, setValue: (value: number) => void) => <label className="block text-sm font-medium text-slate-700">{label}: {value}<input className="mt-2 w-full accent-brand-600" type="range" min="-80" max="80" value={value} onChange={(event) => setValue(Number(event.target.value))} /></label>;
  return <div className="space-y-2"><p className="text-sm font-medium text-slate-700">Cover image <span className="text-brand-600">*</span></p>{value ? <><div className="relative overflow-hidden rounded-xl border border-slate-200"><img src={value} alt="Selected upload" className="h-52 w-full object-cover" /><div className="absolute right-2 top-2 flex gap-2"><button type="button" onClick={() => setEditing(true)} className="rounded-full bg-white/90 p-2 text-slate-600 shadow hover:text-brand-600" aria-label="Edit image" title="Edit image"><SlidersHorizontal className="h-4 w-4" /></button><button type="button" onClick={() => onChange('')} className="rounded-full bg-white/90 p-2 text-slate-600 shadow hover:text-brand-600" aria-label="Remove image"><X className="h-4 w-4" /></button></div></div><Modal open={editing} onClose={() => setEditing(false)} title="Edit cover image" subtitle="Changes are saved as a Cloudinary transformation URL." size="lg" footer={<><Button variant="outline" onClick={() => { setRotation(0); setBrightness(0); setContrast(0); setSaturation(0); setCrop('original'); }}>Reset</Button><Button onClick={applyEdits}>Apply edits</Button></>}><div className="grid gap-6 md:grid-cols-2"><div className="overflow-hidden rounded-xl bg-slate-100"><img src={value} alt="Image edit preview" className="h-72 w-full object-cover transition" style={previewStyle} /></div><div className="space-y-5"><div><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><RotateCw className="h-4 w-4" />Rotation</p><div className="flex gap-2">{[0, 90, 180, 270].map((angle) => <Button key={angle} type="button" size="sm" variant={rotation === angle ? 'primary' : 'outline'} onClick={() => setRotation(angle)}>{angle}°</Button>)}</div></div><div><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Crop className="h-4 w-4" />Crop format</p><div className="flex flex-wrap gap-2">{([{ id: 'original', label: 'Original' }, { id: 'square', label: 'Square' }, { id: 'landscape', label: '16:9' }] as const).map((option) => <Button key={option.id} type="button" size="sm" variant={crop === option.id ? 'primary' : 'outline'} onClick={() => setCrop(option.id)}>{option.label}</Button>)}</div></div>{adjust('Brightness', brightness, setBrightness)}{adjust('Contrast', contrast, setContrast)}{adjust('Saturation', saturation, setSaturation)}</div></div></Modal></> : <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void upload(event.dataTransfer.files[0]); }} className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center transition hover:border-brand-400 hover:bg-brand-50"><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />{uploading ? <Loader2 className="h-7 w-7 animate-spin text-brand-600" /> : <ImagePlus className="h-7 w-7 text-brand-600" />}<span className="mt-2 text-sm font-semibold text-slate-700">{uploading ? 'Uploading image…' : 'Drag and drop an image here'}</span><span className="mt-1 text-xs text-slate-500">or click to browse · PNG, JPG, WEBP up to 10 MB</span></button>}{error && <p className="text-xs text-brand-600">{error}</p>}</div>;
}
