const admin = require('firebase-admin');
const path = require('path');

async function testFirebase() {
  try {
    console.log('🔥 Testando Firebase Admin SDK...');
    
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    console.log(`📄 Caminho do service account: ${serviceAccountPath}`);
    
    const fs = require('fs');
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Arquivo de service account não encontrado!');
      return;
    }
    
    const serviceAccount = require(serviceAccountPath);
    console.log(`📧 Service account email: ${serviceAccount.client_email}`);
    
    // Initialize Firebase
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    console.log('✅ Firebase inicializado com sucesso!');
    
    // Test Firestore connection
    const db = admin.firestore();
    const testCollection = await db.collection('test').limit(1).get();
    console.log('✅ Conexão com Firestore funcionando!');
    
    // Test create operation
    const testDoc = await db.collection('test').add({ message: 'Hello World!', timestamp: new Date() });
    console.log(`✅ Documento criado com ID: ${testDoc.id}`);
    
    // Test read operation
    const doc = await testDoc.get();
    console.log(`✅ Documento lido: ${JSON.stringify(doc.data())}`);
    
    // Clean up
    await testDoc.delete();
    console.log('✅ Documento removido!');
    
    console.log('🎉 Todos os testes passaram!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

testFirebase();
