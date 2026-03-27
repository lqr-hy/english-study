export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  modifiedDate: number;
  createdDate: number;
  children?: FileItem[];
} 