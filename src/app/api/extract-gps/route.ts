// @ts-nocheck
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Write to temporary file
    const tmpDir = os.tmpdir()
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = path.join(tmpDir, filename)
    
    const arrayBuffer = await file.arrayBuffer()
    await fs.writeFile(filePath, Buffer.from(arrayBuffer))

    return new Promise<NextResponse>((resolve) => {
      const python = spawn('python3', ['extract_gps.py', filePath], { 
        cwd: process.cwd(),
        timeout: 30000 // 30 second timeout
      })
      
      let stdout = ''
      let stderr = ''
      
      python.stdout.on('data', (chunk) => {
        stdout += chunk.toString()
      })
      
      python.stderr.on('data', (chunk) => {
        stderr += chunk.toString()
      })
      
      python.on('close', async (code) => {
        // Clean up temporary file
        try {
          await fs.unlink(filePath)
        } catch (unlinkError) {
          console.error('Error cleaning up temp file:', unlinkError)
        }

        if (code !== 0) {
          console.error('Python script error:', stderr)
          return resolve(
            NextResponse.json(
              { error: 'Failed to extract GPS data from image' }, 
              { status: 500 }
            )
          )
        }

        try {
          const result = JSON.parse(stdout.trim())
          
          if (result.error) {
            return resolve(
              NextResponse.json(
                { error: result.error }, 
                { status: 400 }
              )
            )
          }
          
          return resolve(NextResponse.json(result))
        } catch (parseError) {
          console.error('JSON parse error:', parseError, 'Raw output:', stdout)
          return resolve(
            NextResponse.json(
              { error: 'Invalid response from GPS extraction' }, 
              { status: 500 }
            )
          )
        }
      })

      python.on('error', async (error) => {
        console.error('Python spawn error:', error)
        try {
          await fs.unlink(filePath)
        } catch (unlinkError) {
          console.error('Error cleaning up temp file after spawn error:', unlinkError)
        }
        resolve(
          NextResponse.json(
            { error: 'Failed to start GPS extraction process' }, 
            { status: 500 }
          )
        )
      })
    })
  } catch (error) {
    console.error('Request processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}