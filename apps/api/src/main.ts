import { createApp } from '../src/create-app'
import { env } from './config/env'

async function bootstrap() {
  try {
    const app = await createApp()
    const port = env.PORT
    await app.listen(port)
    console.log(`Application is running on: http://localhost:${port}/api/v1`)
    if (
      env.NODE_ENV !== 'production' ||
      env.ENABLE_SWAGGER === 'true'
    ) {
      console.log(
        `Swagger documentation: http://localhost:${port}/api/v1/docs`
      )
    }
  } catch (error) {
    console.error('Error during bootstrap:', error)
    process.exit(1)
  }
}

void bootstrap()
