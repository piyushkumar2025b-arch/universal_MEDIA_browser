import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export interface ApiSpecParameter {
  required: boolean;
  type: string;
  default?: any;
}

export interface ApiSpecEndpoint {
  method: string;
  path: string;
  parameters?: Record<string, ApiSpecParameter>;
}

export interface ApiSpec {
  provider: {
    id: string;
    name: string;
    category: string[];
  };
  documentation: {
    website: string;
    api_docs: string;
  };
  connection: {
    base_url: string;
    protocol: string;
    authentication: {
      type: string;
      location: string;
      variable: string | null;
    };
  };
  endpoints: Record<string, ApiSpecEndpoint>;
  pagination: {
    type: string;
  };
  response: {
    format: string;
  };
  rate_limit: {
    requests_per_hour: number;
    requests_per_month: number;
  };
  errors: {
    retry: number[];
  };
  validation: {
    require: string[];
  };
  fallback: string[];
  // Metadata populated at runtime
  filePath?: string;
  authConfigured?: boolean;
}

export class ApiRegistry {
  private specs: Map<string, ApiSpec> = new Map();
  private specsByCategory: Map<string, ApiSpec[]> = new Map();

  constructor() {
    this.loadSpecs();
  }

  public loadSpecs(): void {
    const specsDir = path.join(process.cwd(), 'api_specs');
    if (!fs.existsSync(specsDir)) {
      console.warn('[ApiRegistry] api_specs directory not found at', specsDir);
      return;
    }

    this.specs.clear();
    this.specsByCategory.clear();

    const categories = fs.readdirSync(specsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const category of categories) {
      const catDir = path.join(specsDir, category);
      const files = fs.readdirSync(catDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

      for (const file of files) {
        const filePath = path.join(catDir, file);
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = YAML.parse(raw) as ApiSpec;

          if (parsed && parsed.provider && parsed.provider.id) {
            // Check auth status from process.env
            const envVar = parsed.connection?.authentication?.variable;
            parsed.authConfigured = envVar ? Boolean(process.env[envVar]) : true;
            parsed.filePath = `api_specs/${category}/${file}`;

            const key = `${category}:${parsed.provider.id}`;
            this.specs.set(key, parsed);
            this.specs.set(parsed.provider.id, parsed);

            const catList = this.specsByCategory.get(category) || [];
            catList.push(parsed);
            this.specsByCategory.set(category, catList);
          }
        } catch (err: any) {
          console.error(`[ApiRegistry] Failed to parse ${filePath}:`, err.message);
        }
      }
    }

    console.log(`[ApiRegistry] Successfully loaded ${this.specsByCategory.size} categories and ${this.specs.size} provider specs from api_specs/`);
  }

  public getAllSpecs(): ApiSpec[] {
    // Unique by provider id
    const unique = new Map<string, ApiSpec>();
    for (const spec of this.specs.values()) {
      unique.set(spec.provider.id, spec);
    }
    return Array.from(unique.values());
  }

  public getSpecsByCategory(category: string): ApiSpec[] {
    return this.specsByCategory.get(category) || [];
  }

  public getSpec(providerId: string): ApiSpec | undefined {
    return this.specs.get(providerId);
  }

  public isAuthRequiredAndMissing(providerId: string): boolean {
    const spec = this.getSpec(providerId);
    if (!spec) return false;
    const authType = spec.connection?.authentication?.type;
    const authVar = spec.connection?.authentication?.variable;
    if (authType && authType !== 'none' && authVar) {
      return !Boolean(process.env[authVar]);
    }
    return false;
  }
}

export const apiRegistry = new ApiRegistry();
