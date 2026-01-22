import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

// 获取 results 文件夹路径
const getResultsPath = () => {
  return join(process.cwd(), 'results');
};

// GET: 获取保存的结果列表
export async function GET() {
  try {
    const resultsPath = getResultsPath();
    const files = await readdir(resultsPath);
    const fileList = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          const filePath = join(resultsPath, file);
          const stats = await stat(filePath);
          return {
            filename: file,
            path: join('results', file),
            size: `${(stats.size / 1024).toFixed(2)} KB`,
            modified: stats.mtime.toLocaleString('zh-CN'),
          };
        })
    );

    // 按修改时间倒序排列
    fileList.sort((a, b) => {
      return new Date(b.modified).getTime() - new Date(a.modified).getTime();
    });

    return NextResponse.json({ results: fileList });
  } catch (error: any) {
    return NextResponse.json(
      { error: `读取结果列表失败: ${error.message}` },
      { status: 500 }
    );
  }
}
