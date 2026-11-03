import codeGsContent from '../../google-apps-script/Code.gs?raw';

export interface AppsScriptFile {
  name: string;
  description: string;
  content: string;
}

export const APPS_SCRIPT_FILES: AppsScriptFile[] = [
  {
    name: 'Code.gs',
    description: 'Complete Single-File Google Apps Script Backend (Sheets Database, Drive Storage, Calendar Sync, Auth, API Router)',
    content: codeGsContent
  }
];

export const UNIFIED_CODE_GS = codeGsContent;

