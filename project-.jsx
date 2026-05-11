import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

/**
 * @typedef {object} CvUploadApiResult
 * @property {string} cvUrl
 * @property {number} score
 * @property {string[]} skills
 * @property {string} [textPreview]
 * @property {string} [feedback]
 * @property {string} [qualitySource]
 */

function FileUploader({ onFilesUpload, cvCount }) {
  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        alert('Certains fichiers ne sont pas supportés. Formats acceptés: PDF, DOCX, TXT');
      }

      if (acceptedFiles.length > 0) {
        onFilesUpload(acceptedFiles);
      }
    },
    [onFilesUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 50,
  });

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-opacity duration-300">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#111111]">📄 Upload CVs</h2>
        {cvCount > 0 && (
          <span className="rounded-full bg-[#f9e98e] px-4 py-2 text-sm font-semibold text-[#111111]">
            {cvCount} CV{cvCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
          isDragActive
            ? 'scale-[1.02] border-[#f9e98e] bg-[#e9f2f2] shadow-[0_12px_40px_rgba(0,0,0,0.1)]'
            : 'border-[#4f4f4f]/30 bg-[#e9f2f2]/50 hover:border-[#f9e98e] hover:bg-[#e9f2f2] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]'
        }`}
      >
        <input {...getInputProps()} />

        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-200 ${
            isDragActive ? 'scale-110 bg-[#f9e98e]' : 'bg-[#f9e98e]'
          }`}
        >
          <svg className="h-10 w-10 text-[#111111]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <p className="mb-3 text-xl font-semibold text-[#111111]">{isDragActive ? 'Déposez les CV ici' : 'Glissez-déposez vos CV ici'}</p>

        <p className="mb-4 text-[#4f4f4f]">ou cliquez pour parcourir</p>

        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <span className="rounded-xl border border-[#4f4f4f]/20 bg-[#ffffff] px-3 py-2 text-[#4f4f4f]">PDF</span>
          <span className="rounded-xl border border-[#4f4f4f]/20 bg-[#ffffff] px-3 py-2 text-[#4f4f4f]">DOCX</span>
          <span className="rounded-xl border border-[#4f4f4f]/20 bg-[#ffffff] px-3 py-2 text-[#4f4f4f]">TXT</span>
        </div>

        <p className="mt-4 text-sm text-[#4f4f4f]/60">Jusqu&apos;à 50 fichiers (démo locale)</p>
      </div>
    </div>
  );
}

/**
 * Zone d’upload PDF connectée au backend Tanit (/api/cv/upload) avec score qualité IA (FastAPI /score).
 * @param {(data: CvUploadApiResult) => void} [props.onUploaded]
 */
export function TanitCvQualityUploader({ onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  /** @type {[CvUploadApiResult | null, Function]} */
  const [last, setLast] = useState(null);

  const onDrop = useCallback(
    async (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        setErr('PDF uniquement (max 5 Mo), compte candidat connecté requis.');
      }
      const pdf = acceptedFiles.find((f) => f.type === 'application/pdf');
      if (!pdf) {
        if (acceptedFiles.length) setErr('Envoie un fichier PDF pour l’analyse Tanit.');
        return;
      }
      setErr('');
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append('file', pdf);
        const res = await fetch('/api/cv/upload', {
          method: 'POST',
          body: fd,
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || res.statusText);
        }
        setLast(data);
        onUploaded?.(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setLast(null);
      } finally {
        setBusy(false);
      }
    },
    [onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: busy,
    maxSize: 5 * 1024 * 1024,
  });

  const sc = typeof last?.score === 'number' ? last.score : null;
  const qs =
    last?.qualitySource === 'llm'
      ? 'Modèle génératif (OpenRouter)'
      : last?.qualitySource === 'unavailable'
        ? 'IA hors ligne (FastAPI injoignable)'
        : 'Heuristique locale (FastAPI)';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-[#111111]">Score qualité du CV (IA)</h2>
          {busy && <span className="rounded-full bg-[#f9e98e] px-3 py-1 text-xs font-bold text-[#111111]">Analyse…</span>}
        </div>

        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
            busy ? 'pointer-events-none opacity-60' : ''
          } ${
            isDragActive
              ? 'border-[#a5d6a7] bg-[#e9f2f2]'
              : 'border-[#4f4f4f]/25 bg-[#e9f2f2]/40 hover:border-[#a5d6a7]'
          }`}
        >
          <input {...getInputProps()} />
          <p className="font-semibold text-[#111111]">{isDragActive ? 'Déposez le PDF…' : 'Glissez un PDF ou cliquez'}</p>
          <p className="mt-2 text-xs text-[#4f4f4f]">Compte candidat · 5 Mo max</p>
        </div>

        {err && <p className="mt-3 text-sm font-medium text-red-700">{err}</p>}
      </div>

      {last && sc != null && (
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center">
            <div
              className="flex size-40 items-center justify-center rounded-full text-2xl font-extrabold text-[#111111]"
              style={{
                background: `conic-gradient(#a5d6a7 ${sc * 3.6}deg, #e0e0e0 0deg)`,
              }}
            >
              <div className="flex size-28 items-center justify-center rounded-full bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">{sc}/100</div>
            </div>
            <p className="mt-2 text-center text-xs text-[#4f4f4f]">Qualité des informations</p>
            <p className="mt-1 text-center text-[10px] text-[#4f4f4f]/70">{qs}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] bg-white p-5 text-sm shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            {last.feedback ? (
              <p className="whitespace-pre-wrap leading-relaxed text-[#4f4f4f]">{last.feedback}</p>
            ) : (
              <p className="text-[#4f4f4f]">
                Aucun message du serveur. Vérifie que le backend (port 3001) et ai-service (<code className="rounded bg-black/5 px-1">localhost:8000</code>)
                sont lancés ; OpenRouter reste facultatif pour le détail avec LLM.
              </p>
            )}
            {Array.isArray(last.skills) && last.skills.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#111111]">Compétences détectées</p>
                <ul className="flex flex-wrap gap-2">
                  {last.skills.map((s) => (
                    <li key={s} className="rounded-full bg-[#e9f2f2] px-3 py-1 text-xs font-semibold text-[#111111]">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUploader;
