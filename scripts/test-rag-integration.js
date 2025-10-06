/**
 * RAG Integration Test Script
 * 
 * Bu script RAG entegrasyonunu test eder.
 * Qdrant, BGE-M3 ve llama.cpp servislerinin çalıştığını kontrol eder.
 */

const fetch = require('node-fetch');

async function testQdrant() {
  try {
    console.log('🔍 Testing Qdrant connection...');
    const response = await fetch('http://127.0.0.1:6333/collections');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Qdrant is running');
      console.log('📊 Collections:', data.result?.collections?.length || 0);
      return true;
    } else {
      console.error('❌ Qdrant connection failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Qdrant test failed:', error.message);
    return false;
  }
}

async function testBGE() {
  try {
    console.log('🔍 Testing BGE-M3 model server...');
    const response = await fetch('http://127.0.0.1:7860/health');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ BGE-M3 model server is running');
      console.log('📊 Model info:', data.modelInfo);
      return true;
    } else {
      console.error('❌ BGE-M3 connection failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ BGE-M3 test failed:', error.message);
    return false;
  }
}

async function testLlama() {
  try {
    console.log('🔍 Testing llama.cpp binary...');
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const process = spawn('main', ['--help'], { stdio: 'pipe' });
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ llama.cpp binary is available');
          resolve(true);
        } else {
          console.error('❌ llama.cpp binary not found or failed');
          resolve(false);
        }
      });
      
      process.on('error', (error) => {
        console.error('❌ llama.cpp test failed:', error.message);
        resolve(false);
      });
    });
  } catch (error) {
    console.error('❌ llama.cpp test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting RAG Integration Tests...\n');
  
  const results = {
    qdrant: await testQdrant(),
    bge: await testBGE(),
    llama: await testLlama()
  };
  
  console.log('\n📊 Test Results:');
  console.log('Qdrant:', results.qdrant ? '✅' : '❌');
  console.log('BGE-M3:', results.bge ? '✅' : '❌');
  console.log('llama.cpp:', results.llama ? '✅' : '❌');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! RAG integration is ready.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the setup.');
    console.log('\nSetup instructions:');
    console.log('1. Start Qdrant: docker run -p 6333:6333 qdrant/qdrant');
    console.log('2. Start BGE-M3 model server: python model_server/app.py');
    console.log('3. Build llama.cpp and place binary in PATH');
  }
  
  return allPassed;
}

// Run tests if called directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests, testQdrant, testBGE, testLlama };
