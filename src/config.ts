import raw from '../toolbox.config.json';
import type { ToolboxConfig } from './types';

export const config = raw as ToolboxConfig;

export const OWNER = config.owner;
