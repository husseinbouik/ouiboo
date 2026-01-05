const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
    const form = new FormData();
    const filePath = 'C:/Users/MVpro/.gemini/antigravity/brain/ac1bb276-8e84-4a6a-a8ff-b1b26f320b28/test_upload_1767186326146.png';
    
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    form.append('file', fs.createReadStream(filePath));

    try {
        console.log('Attempting upload to http://localhost:3000/api/upload');
        const response = await axios.post('http://localhost:3000/api/upload', form, {
            headers: {
                ...form.getHeaders()
            }
        });
        console.log('Upload Success!', response.data);
    } catch (error) {
        console.error('Upload Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testUpload();
