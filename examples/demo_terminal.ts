
import chalk from 'chalk';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function typeWriter(text: string, speed: number = 30) {
    for (const char of text) {
        process.stdout.write(char);
        await sleep(Math.random() * speed + 10);
    }
    process.stdout.write('\n');
}

async function run() {
    console.clear();
    await sleep(1000);

    // 1. Simulating the Agent
    console.log(chalk.blue('🤖 Agent (LLM): ') + 'I need to fix the billing issue for User 123.');
    await sleep(1000);
    console.log(chalk.blue('🤖 Agent (LLM): ') + 'Proposing action to database...');
    await sleep(800);
    
    // 2. The Dangerous Proposal
    console.log(chalk.gray('\n> Generating SQL...'));
    await sleep(1500);
    const sql = "UPDATE users SET role = 'admin' WHERE id = 123;";
    await typeWriter(chalk.yellow(`  ${sql}`), 50);
    await sleep(500);

    // 3. ABS Intervention
    console.log(chalk.gray('\n⚡ ABS Core Intercepting...'));
    await sleep(600);
    console.log(chalk.dim('  Scanning policy invariants...'));
    await sleep(400);
    console.log(chalk.dim('  Checking authorization scope...'));
    await sleep(800);

    // 4. The Block
    console.log('\n' + chalk.bgRed.bold.white(' 🛡️  VIOLATION DETECTED '));
    console.log(chalk.red('  Policy: ') + 'strict-access-control');
    console.log(chalk.red('  Reason: ') + 'Agents cannot elevate privileges.');
    console.log(chalk.red('  Status: ') + 'DENIED (Action blocked)');

    await sleep(1000);
    console.log(chalk.green('\n✅ System Secure. Incident logged (ID: abs_evt_99281).'));
    console.log('\n');
}

run();
