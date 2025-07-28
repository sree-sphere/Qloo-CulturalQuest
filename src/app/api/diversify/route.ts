import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const { entities, userPreferences, options = {} } = await request.json();
    
    // Validate input
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return NextResponse.json({ error: 'Entities array is required' }, { status: 400 });
    }
    
    if (!userPreferences || !Array.isArray(userPreferences)) {
      return NextResponse.json({ error: 'User preferences array is required' }, { status: 400 });
    }
    
    // Create temporary input file
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const inputFile = path.join(tempDir, `input_${Date.now()}.json`);
    const outputFile = path.join(tempDir, `output_${Date.now()}.json`);
    
    // Write entities to temporary file
    await fs.writeFile(inputFile, JSON.stringify({ entities }));
    
    // Prepare Python script arguments
    const pythonScript = path.join(process.cwd(), 'smart_diversification.py');
    const args = [
      pythonScript,
      '--input', inputFile,
      '--output', outputFile,
      '--preferences', JSON.stringify(userPreferences),
      '--n_total', (options.nTotal || 8).toString(),
      '--n_high_affinity', (options.nHighAffinity || 3).toString(),
      '--lambda_param', (options.lambdaParam || 0.7).toString()
    ];
    
    // Execute Python script
    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const python = spawn('python', args);
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        }
      });
      
      // Set timeout
      setTimeout(() => {
        python.kill();
        reject(new Error('Python script timeout'));
      }, 30000);
    });
    
    // Read results
    const diversifiedResults = JSON.parse(await fs.readFile(outputFile, 'utf-8'));
    
    // Cleanup temporary files
    await fs.unlink(inputFile).catch(() => {});
    await fs.unlink(outputFile).catch(() => {});
    
    return NextResponse.json({
      success: true,
      data: diversifiedResults,
      logs: result.stdout
    });
    
  } catch (error) {
    console.error('Diversification API error:', error);
    return NextResponse.json(
      { error: 'Failed to diversify recommendations', details: error.message },
      { status: 500 }
    );
  }
}