declare module '@project/project-.jsx' {
  export interface TanitCvUploadPayload {
    cvUrl?: string
    score?: number
    skills?: string[]
    textPreview?: string
    feedback?: string
    qualitySource?: string
  }

  export function TanitCvQualityUploader(props: { onUploaded?: (data: TanitCvUploadPayload) => void }): import('react').JSX.Element

  export default function FileUploader(props: {
    cvCount: number
    onFilesUpload: (files: File[]) => void
  }): import('react').JSX.Element
}
