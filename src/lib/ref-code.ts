import { prisma } from '@/lib/prisma'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem I, O, 0, 1 pra evitar confusão visual

export function generateRefCode(length = 7): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }
  return code
}

export async function generateUniqueRefCode(): Promise<string> {
  let attempts = 0
  while (attempts < 10) {
    const code = generateRefCode()
    const existing = await prisma.user_roles.findUnique({
      where: { ref_code: code },
      select: { id: true },
    })
    if (!existing) return code
    attempts++
  }
  // fallback com timestamp para garantir unicidade
  return generateRefCode(5) + Date.now().toString(36).toUpperCase().slice(-2)
}
