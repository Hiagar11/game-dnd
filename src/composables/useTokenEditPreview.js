export function useTokenEditPreview({ previewSrc, fileRef, playClick, emit }) {
  function revokePreviewBlob() {
    if (previewSrc.value?.startsWith('blob:')) {
      URL.revokeObjectURL(previewSrc.value)
    }
  }

  function onFile(file) {
    revokePreviewBlob()
    fileRef.value = file
    previewSrc.value = URL.createObjectURL(file)
  }

  function onCancel() {
    playClick()
    revokePreviewBlob()
    emit('close')
  }

  return {
    onFile,
    onCancel,
  }
}
