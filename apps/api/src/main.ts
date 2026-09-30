import { createApp } from '../src/create-app'

async function bootstrap() {
  try {
    const app = await createApp()
    const port = process.env.PORT || 3000
    await app.listen(port)
    console.log(`Application is running on: http://localhost:${port}/api/v1`)
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.ENABLE_SWAGGER === 'true'
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
