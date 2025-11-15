import { AssistantAgent, ImageGenerationTool } from '../index';

/**
 * Example: Using ImageGenerationTool with DALL-E
 * Demonstrates image generation using AI
 */
async function main() {
  console.log('=== Image Generation Tool Example ===\n');

  if (!process.env.OPENAI_API_KEY) {
    console.log('This example requires OPENAI_API_KEY environment variable.');
    console.log('Please set it and try again.');
    return;
  }

  // Create Image Generation Tool
  const imageTool = new ImageGenerationTool({
    openaiApiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'dall-e-3',
    defaultSize: '1024x1024',
    defaultQuality: 'standard'
  });

  console.log('Image Generation Tool created with DALL-E 3\n');

  // Example 1: Generate a simple image
  console.log('Example 1: Generate an image');
  try {
    const imageUrls = await imageTool.generateImage(
      'A serene landscape with mountains, a lake, and a sunset',
      {
        size: '1024x1024',
        quality: 'standard',
        style: 'natural'
      }
    );

    console.log('Generated image URL:', imageUrls[0]);
    console.log();

    // Download the image
    console.log('Downloading image...');
    const outputPath = '/tmp/generated-landscape.png';
    await imageTool.downloadImage(imageUrls[0], outputPath);
    console.log(`Image saved to: ${outputPath}\n`);
  } catch (error: any) {
    console.error('Error generating image:', error.message);
  }

  // Example 2: Generate with vivid style
  console.log('Example 2: Generate with vivid style');
  try {
    const imageUrls = await imageTool.generateImage(
      'A futuristic city with flying cars and neon lights',
      {
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid'
      }
    );

    console.log('Generated image URL:', imageUrls[0]);
    const outputPath = '/tmp/generated-city.png';
    await imageTool.downloadImage(imageUrls[0], outputPath);
    console.log(`Image saved to: ${outputPath}\n`);
  } catch (error: any) {
    console.error('Error generating image:', error.message);
  }

  // Example 3: Use with agent for intelligent image generation
  console.log('Example 3: Agent-driven image generation');
  
  // Create function contracts
  const functions = ImageGenerationTool.createFunctionContracts(imageTool);

  // Create assistant with image generation capabilities
  const assistant = new AssistantAgent({
    name: 'image_assistant',
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    systemMessage: `You are a creative image generation assistant. You can help users create images using DALL-E.
When asked to create an image, use the generate_image function with a detailed, descriptive prompt.
After generating, use download_image to save it to a file.`,
    model: 'gpt-3.5-turbo',
    functions
  });

  console.log('Assistant created with image generation tools:');
  console.log('- generate_image');
  console.log('- download_image\n');

  const testMessages = [
    {
      role: 'user' as const,
      content: 'Create an artistic image of a robot painting on a canvas in a studio'
    }
  ];

  try {
    const response = await assistant.generateReply(testMessages);
    console.log('User: Create an artistic image of a robot painting on a canvas in a studio');
    console.log('Agent:', response.content);
    console.log();
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  // Example 4: Generate different sizes
  console.log('Example 4: Generate different sizes');
  const sizes: Array<'1024x1024' | '1792x1024' | '1024x1792'> = ['1024x1024', '1792x1024', '1024x1792'];
  
  for (const size of sizes) {
    console.log(`Generating ${size} image...`);
    try {
      const imageUrls = await imageTool.generateImage(
        'A minimalist logo design for a tech company',
        { size }
      );
      console.log(`✓ Generated ${size}: ${imageUrls[0].substring(0, 50)}...`);
    } catch (error: any) {
      console.log(`✗ Failed to generate ${size}:`, error.message);
    }
  }
  console.log();

  // Example 5: HD quality (DALL-E 3)
  console.log('Example 5: Generate HD quality image');
  try {
    const imageUrls = await imageTool.generateImage(
      'A detailed close-up of a mechanical watch showing intricate gears',
      {
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid'
      }
    );

    console.log('Generated HD image URL:', imageUrls[0]);
    const outputPath = '/tmp/generated-hd-watch.png';
    await imageTool.downloadImage(imageUrls[0], outputPath);
    console.log(`HD image saved to: ${outputPath}\n`);
  } catch (error: any) {
    console.error('Error generating HD image:', error.message);
  }

  console.log('Done!');
  console.log('\nNote: DALL-E 3 only supports generating 1 image at a time.');
  console.log('For variations or edits, use DALL-E 2 features (not shown in this example).');
}

// Run the example
main().catch(console.error);
