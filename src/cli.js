#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const ora = require('ora');
const axios = require('axios');

// Lista de componentes disponíveis
const AVAILABLE_COMPONENTS = ['Alert', 'Avatar', 'Card', 'Toast'].sort();

// Caminho do arquivo de configuração
const CONFIG_FILE = 'albatroz.json';

// Configuração padrão
const DEFAULT_CONFIG = {
  baseUrl: 'https://raw.githubusercontent.com/your-repo/albatroz/main/components',
  dependencies: {
    expo: false,
    'lucide-react-native': false
  }
};

// Função para verificar se é um projeto Expo válido
const checkExpoProject = () => {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Verifica se expo está nas dependências
    if (!dependencies.expo) {
      console.error(chalk.red('\nError: This is not an Expo project, at this moment, we only support Expo projects.'));
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

// Função para verificar dependência no package.json
const checkDependency = (dependency) => {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return !!dependencies[dependency];
  } catch (error) {
    return false;
  }
};

// Função para verificar e criar arquivo de configuração
const ensureConfig = async () => {
  if (!fs.existsSync(CONFIG_FILE)) {
    await initializeProject();
    return false;
  }
  return true;
};

// Função para ler configuração
const readConfig = () => {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
};

// Função para salvar configuração
const saveConfig = (config) => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

// Função para inicializar o projeto
const initializeProject = async () => {
  console.log(chalk.blue('\nInitializing Albatroz UI...'));

  // Verificar se é um projeto Expo
  checkExpoProject();

  // Verificar dependências existentes
  const config = { ...DEFAULT_CONFIG };
  config.dependencies.expo = checkDependency('expo');
  config.dependencies['lucide-react-native'] = checkDependency('lucide-react-native');

  // Perguntar package manager apenas se precisar instalar algo
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

    // Salvar configuração
    saveConfig(config);
    
    spinner.succeed(chalk.green('Project initialized successfully!'));
    return true;
  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize project'));
    console.error(chalk.red('\nError details:'), error.message);
    return false;
  }
};

// Resto do código continua igual...

// Configuração inicial do programa
program
  .name('@albatroz/ui')
  .description('CLI for Albatroz UI components')
  .version('1.0.0');

// Comando init
program
  .command('init')
  .description('Initialize Albatroz UI in your project')
  .action(async () => {
    await initializeProject();
  });

// Comando add
program
  .command('add [component]')
  .description('Add a component to your project')
  .action(async (component) => {
    try {
      // Verificar se é um projeto Expo primeiro
      checkExpoProject();

      // Verificar se o projeto está inicializado
      if (!await ensureConfig()) {
        console.log(chalk.yellow('\nPlease run init command first.'));
        return;
      }

      // Resto do código do comando add continua igual...
    } catch (error) {
      console.error(chalk.red('\nError:'), error.message);
    }
  });

// Tratar comandos desconhecidos
program.on('command:*', () => {
  console.error(chalk.red('\nError: Invalid command'));
  console.log(chalk.gray('\nAvailable commands:'));
  console.log(chalk.yellow('  - init'));
  console.log(chalk.yellow('  - add [component]'));
  process.exit(1);
});

// Iniciar o programa
program.parse(process.argv);