#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const ora = require('ora');
const axios = require('axios');

const AVAILABLE_COMPONENTS = ['alert', 'avatar', 'card', 'toast'];

const CONFIG_FILE = 'albatroz.json';

const DEFAULT_CONFIG = {
  baseUrl: 'https://raw.githubusercontent.com/eugustavo/albatroz/refs/heads/main/src/components',
  dependencies: {
    expo: false,
    'lucide-react-native': false
  }
};

const formatComponentName = (name) => {
  if (!name) return '';
  return name.charAt(0).toLowerCase() + name.slice(1).toLowerCase();
};

const downloadComponent = async (componentName, baseUrl) => {
  try {
    const response = await axios.get(`${baseUrl}/${componentName.toLowerCase()}.tsx`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error('Component not found in repository');
    }
    throw error;
  }
};

const checkExpoProject = () => {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (!dependencies.expo) {
      console.error(chalk.red('\nError: This is not an Expo project'));
      console.log(chalk.yellow('\nAt this moment, we only support Expo projects.'));
      console.log(chalk.gray('\nPlease create a new project using:'));
      console.log(chalk.blue('\n  npx create-expo-app@latest'));
      process.exit(1);
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red('\nError: Could not find package.json'));
    console.log(chalk.yellow('\nPlease make sure you are in the root of your project.'));
    process.exit(1);
  }
};

const checkDependency = (dependency) => {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return !!dependencies[dependency];
  } catch (error) {
    return false;
  }
};

const ensureConfig = async () => {
  if (!fs.existsSync(CONFIG_FILE)) {
    await initializeProject();
    return false;
  }
  return true;
};

const readConfig = () => {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
};

const saveConfig = (config) => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

const addComponent = async (componentName, config) => {
  const spinner = ora('Adding component...').start();

  try {
    const normalizedName = componentName.toLowerCase();
    
    if (!AVAILABLE_COMPONENTS.includes(normalizedName)) {
      spinner.fail(chalk.red('Component not available'));
      console.log(chalk.blue('\nAvailable components:'));
      AVAILABLE_COMPONENTS.forEach(comp => {
        console.log(chalk.yellow(`  - ${formatComponentName(comp)}`));
      });
      return;
    }

    const componentContent = await downloadComponent(componentName, config.baseUrl);

    const componentPath = path.join(process.cwd(), 'src', 'components', 'ui');
    await fs.ensureDir(componentPath);

    const formattedName = formatComponentName(componentName);
    await fs.writeFile(
      path.join(componentPath, `${formattedName}.tsx`),
      componentContent
    );

    spinner.succeed(chalk.green(`Component ${formattedName} added successfully!`));
    console.log(chalk.gray(`\nLocation: src/components/ui/${formattedName}.tsx`));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to add component ${formatComponentName(componentName)}`));
    console.error(chalk.red('\nError details:'), error.message);
  }
};

const initializeProject = async () => {
  console.log(chalk.blue('\nInitializing Albatroz UI...'));

  checkExpoProject();

  const config = { ...DEFAULT_CONFIG };
  config.dependencies.expo = checkDependency('expo');
  config.dependencies['lucide-react-native'] = checkDependency('lucide-react-native');

  let packageManager;
  if (!config.dependencies['lucide-react-native']) {
    const response = await inquirer.prompt([
      {
        type: 'list',
        name: 'packageManager',
        message: 'Which package manager do you want to use?',
        choices: ['npm', 'yarn', 'pnpm']
      }
    ]);
    packageManager = response.packageManager;
  }

  const spinner = ora('Checking and installing dependencies...').start();

  try {
    if (!config.dependencies['lucide-react-native']) {
      const installCommand = {
        npm: 'npm install',
        yarn: 'yarn add',
        pnpm: 'pnpm add'
      }[packageManager];

      if (!config.dependencies['lucide-react-native']) {
        execSync(`${installCommand} lucide-react-native`, { stdio: 'pipe' });
        config.dependencies['lucide-react-native'] = true;
      }
    }

    saveConfig(config);
    
    spinner.succeed(chalk.green('Project initialized successfully!'));
    return true;
  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize project'));
    console.error(chalk.red('\nError details:'), error.message);
    return false;
  }
};

program
  .name('@albatroz/ui')
  .description('CLI for Albatroz UI components')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize Albatroz UI in your project')
  .action(async () => {
    await initializeProject();
  });

program
  .command('add [component]')
  .description('Add a component to your project')
  .action(async (component) => {
    try {
      checkExpoProject();

      if (!await ensureConfig()) {
        console.log(chalk.yellow('\nPlease run init command first.'));
        return;
      }

      const config = readConfig();

      if (!component) {
        console.log(chalk.blue('\nAvailable components:'));
        AVAILABLE_COMPONENTS.forEach(comp => {
          console.log(chalk.yellow(`  - ${formatComponentName(comp)}`));
        });
        console.log(chalk.gray('\nUsage:'));
        console.log(chalk.yellow('  npx @albatroz/ui add <component>'));
        return;
      }

      await addComponent(component, config);
    } catch (error) {
      console.error(chalk.red('\nError:'), error.message);
    }
  });

program.on('command:*', () => {
  console.error(chalk.red('\nError: Invalid command'));
  console.log(chalk.gray('\nAvailable commands:'));
  console.log(chalk.yellow('  - init'));
  console.log(chalk.yellow('  - add [component]'));
  process.exit(1);
});

program.parse(process.argv);