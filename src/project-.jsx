import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
}

export default function FileUploader({ cvCount, onFilesUpload }) {
  const onDrop = useCallback(
    (accepted) => {
      if (accepted.length) onFilesUpload(accepted)
    },
    [onFilesUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: true,
  })

  return (
    <section className="card animate-fade-in">
      <h2 className="mb-2 text-2xl font-bold text-neutral-text">📄 Dépose ton CV</h2>
      <p className="mb-6 text-sm text-neutral-text-secondary">
        PDF, Word ou texte — glisse-dépose ou clique pour choisir. Tu peux ajouter plusieurs fichiers.
      </p>

      <div
        {...getRootProps()}
        className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragActive
            ? 'border-neutral-text bg-primary-cta/30'
            : 'border-black/20 bg-primary-bg/60 hover:border-black/35 hover:bg-primary-bg'
        }`}
      >
        <input {...getInputProps()} />
        <span className="text-4xl" aria-hidden>
          {isDragActive ? '📥' : '📎'}
        </span>
        <p className="mt-4 text-sm font-semibold text-neutral-text">
          {isDragActive ? 'Relâche pour déposer' : 'Glisse tes fichiers ici ou clique pour parcourir'}
        </p>
        <p className="mt-2 text-xs text-neutral-text-secondary">.pdf, .doc, .docx, .txt</p>
      </div>

      {cvCount > 0 && (
        <p className="mt-4 text-center text-sm font-medium text-neutral-text">
          {cvCount} fichier{cvCount > 1 ? 's' : ''} enregistré{cvCount > 1 ? 's' : ''}
        </p>
      )}
    </section>
  )
}
