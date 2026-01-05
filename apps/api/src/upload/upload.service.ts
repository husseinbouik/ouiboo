import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
    async uploadFile(file: Express.Multer.File) {
        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
        const filePath = path.join(uploadDir, filename);

        // Write file to buffer
        fs.writeFileSync(filePath, file.buffer);

        // Return URL pointing to local server
        const baseUrl = process.env.API_URL || 'http://localhost:3000/api';
        // Note: We'll serve the 'uploads' folder efficiently using ServeStaticModule
        const fileUrl = `${baseUrl.replace('/api', '')}/uploads/${filename}`;

        return {
            url: fileUrl,
            filename: filename,
            size: file.size,
        };
    }
}
