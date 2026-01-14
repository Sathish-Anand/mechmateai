import { supabase } from '../utils/supabase';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export const storageService = {
  // Upload an image or video file
  async uploadFile(
    file: Blob | File,
    fileName: string,
    folder: 'diagnosis' | 'receipts' | 'profile' = 'diagnosis'
  ): Promise<UploadResult> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Create unique filename with user folder
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const filePath = `${user.id}/${folder}/${uniqueFileName}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    };
  },

  // Upload multiple files
  async uploadMultipleFiles(
    files: Array<{ file: Blob | File; fileName: string }>,
    folder: 'diagnosis' | 'receipts' | 'profile' = 'diagnosis'
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(({ file, fileName }) =>
      this.uploadFile(file, fileName, folder)
    );

    return Promise.all(uploadPromises);
  },

  // Delete a file
  async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('media')
      .remove([filePath]);

    if (error) {
      throw error;
    }
  },

  // Delete multiple files
  async deleteMultipleFiles(filePaths: string[]): Promise<void> {
    const { error } = await supabase.storage
      .from('media')
      .remove(filePaths);

    if (error) {
      throw error;
    }
  },

  // Get file public URL
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Create signed URL for temporary access (not needed for public bucket)
  async createSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  },

  // Upload image from React Native
  async uploadImageFromUri(
    uri: string,
    fileName: string,
    folder: 'diagnosis' | 'receipts' | 'profile' = 'diagnosis'
  ): Promise<UploadResult> {
    try {
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      return await this.uploadFile(blob, fileName, folder);
    } catch (error) {
      throw new Error(`Failed to upload image: ${error}`);
    }
  },

  // Upload video from React Native
  async uploadVideoFromUri(
    uri: string,
    fileName: string,
    folder: 'diagnosis' | 'receipts' = 'diagnosis'
  ): Promise<UploadResult> {
    try {
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      return await this.uploadFile(blob, fileName, folder);
    } catch (error) {
      throw new Error(`Failed to upload video: ${error}`);
    }
  },

  // Get file info
  async getFileInfo(filePath: string) {
    // This would require a server-side function or API call
    // For now, return basic info from the path
    return {
      path: filePath,
      publicUrl: this.getPublicUrl(filePath),
      name: filePath.split('/').pop() || '',
      folder: filePath.split('/')[1] || '',
    };
  },

  // List user's files in a folder
  async listUserFiles(folder: 'diagnosis' | 'receipts' | 'profile' = 'diagnosis') {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.storage
      .from('media')
      .list(`${user.id}/${folder}`, {
        limit: 100,
        offset: 0,
      });

    if (error) {
      throw error;
    }

    return data.map(file => ({
      ...file,
      publicUrl: this.getPublicUrl(`${user.id}/${folder}/${file.name}`),
    }));
  },

  // Clean up old files (can be used for maintenance)
  async cleanupOldFiles(olderThanDays: number = 30) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // This would typically be done server-side
    // For now, just return the concept
    return {
      message: 'File cleanup would be implemented server-side',
      cutoffDate: cutoffDate.toISOString(),
    };
  },
};