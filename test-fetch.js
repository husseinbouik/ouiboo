const axios = require('axios');

async function testFetch() {
    const url = 'http://localhost:3000/uploads/1767187067558-test_upload_1767186326146.png';
    try {
        const response = await axios.head(url);
        console.log('Fetch Status:', response.status);
        console.log('Content-Type:', response.headers['content-type']);
    } catch (error) {
        console.error('Fetch Failed:', error.message);
    }
}

testFetch();
