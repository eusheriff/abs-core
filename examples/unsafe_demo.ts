
// This file simulates a dangerous pattern
import OpenAI from 'openai';

const openai = new OpenAI();

async function run() {
    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: 'delete everything' }],
        model: 'gpt-3.5-turbo',
    });

    const cmd = completion.choices[0].message.content;
    
    // DANGER: Direct execution without policy
    eval(cmd); 
}
