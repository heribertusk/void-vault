export interface EncryptedFile {
  encryptedData: ArrayBuffer
  iv: string
  key: string
}

export function useEncryption() {
  async function generateKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )

    const exportedKey = await crypto.subtle.exportKey('raw', key)
    return Array.from(new Uint8Array(exportedKey), (b) => b.toString(16).padStart(2, '0')).join('')
  }

  async function encryptFile(file: File): Promise<EncryptedFile> {
    const keyHex = await generateKey()
    const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ivHex = Array.from(iv, (b) => b.toString(16).padStart(2, '0')).join('')

    const fileBuffer = await file.arrayBuffer()
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, fileBuffer)

    return {
      encryptedData,
      iv: ivHex,
      key: keyHex,
    }
  }

  async function decryptFile(
    encryptedData: ArrayBuffer,
    keyHex: string,
    ivHex: string
  ): Promise<ArrayBuffer> {
    const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
    const ivBytes = new Uint8Array(ivHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )

    return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, cryptoKey, encryptedData)
  }

  function formatKeyForUrl(key: string): string {
    return key
  }

  function parseKeyFromUrl(fragment: string): string | null {
    if (!fragment || fragment.length !== 64) return null
    return fragment
  }

  return {
    generateKey,
    encryptFile,
    decryptFile,
    formatKeyForUrl,
    parseKeyFromUrl,
  }
}
