import { execSync } from 'child_process';

export class OnePasswordService {
  async getCredentials(): Promise<{ email: string; password: string }> {
    // Always use pocketcasts.com regardless of input parameter
    const output = execSync('op item get pocketcasts.com --format json');
    const data = JSON.parse(output.toString());

    return {
      email: data['fields'].find((f: any) => f['label'] === 'username')['value'],
      password: data['fields'].find((f: any) => f['label'] === 'password')['value']
    };
  }
} 