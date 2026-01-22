import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, stat, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

// 获取 results 文件夹路径
const getResultsPath = () => {
  return join(process.cwd(), 'results');
};

// 确保 results 文件夹存在
async function ensureResultsDir() {
  const resultsPath = getResultsPath();
  try {
    await mkdir(resultsPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      console.error('创建 results 文件夹失败:', error);
    }
  }
}

// 将对象中的函数转换为可序列化的格式
function serializeFunctions(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'function') {
    return {
      __function__: true,
      __source__: obj.toString(),
    };
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeFunctions);
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeFunctions(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

// 保存结果到文件
async function saveResult(toolName: string, args: any, result: any): Promise<string> {
  await ensureResultsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${toolName}_${timestamp}.json`;
  const filePath = join(getResultsPath(), filename);

  const dataToSave = {
    toolName,
    args,
    result,
    timestamp: new Date().toISOString(),
  };

  await writeFile(filePath, JSON.stringify(serializeFunctions(dataToSave), null, 2), 'utf-8');
  return filename;
}

// GET: 获取工具列表
export async function GET() {
  return NextResponse.json({
    tools: [
      {
        name: 'hello',
        description: '一个简单的问候工具，向指定的人打招呼',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '要问候的人的名字',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_current_time',
        description: '获取当前时间',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'clean_trash',
        description: '清理电脑上的垃圾桶（macOS）',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_directory',
        description: `查看指定文件夹下的项目和文件列表。

数据字段说明：
- name: 文件/文件夹名称（字符串类型）
- type: 类型（分类字段，值为"文件夹"或"文件"）
- size: 文件大小（数值字段，单位KB/MB，仅文件有值，文件夹为"-"）
- modified: 修改时间（日期时间字段，格式：YYYY/M/D H:mm:ss）

可视化建议：
1. type字段 → 饼图（pie chart）
   - 用途：展示文件夹和文件的数量分布
   - 分组：文件夹、文件
   - 聚合方式：count（计数）
   
2. size字段 → 柱状图（bar chart）
   - 用途：展示文件大小分布
   - 数据范围：仅统计type为"文件"且size不为"-"的项
   - 分箱范围：
     * 0-1 KB
     * 1-10 KB
     * 10-100 KB
     * 100 KB-1 MB
     * >1 MB
   - 聚合方式：histogram（直方图）

前端应该根据返回的items数据自动生成这些图表。`,
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '要查看的文件夹路径',
            },
          },
          required: ['path'],
        },
      },
    ],
  });
}

// POST: 调用工具
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolName, args } = body;

    if (!toolName) {
      return NextResponse.json(
        { error: '缺少必需参数: toolName' },
        { status: 400 }
      );
    }

    let result: any;

    switch (toolName) {
      case 'hello': {
        const { name: userName } = args || {};
        if (!userName) {
          return NextResponse.json(
            { error: '缺少必需参数: name' },
            { status: 400 }
          );
        }
        result = {
          content: [
            {
              type: 'text',
              text: `你好，${userName}！这是一个简单的 MCP 工具示例。`,
            },
          ],
        };
        break;
      }

      case 'get_current_time': {
        const now = new Date();
        result = {
          content: [
            {
              type: 'text',
              text: `当前时间是：${now.toLocaleString('zh-CN')}`,
            },
          ],
        };
        break;
      }

      case 'clean_trash': {
        try {
          // 在 macOS 上使用 osascript 清理垃圾桶
          const { stdout, stderr } = await execAsync(
            'osascript -e \'tell application "Finder" to empty trash\''
          );

          if (stderr && !stderr.includes('User cancelled')) {
            throw new Error(`清理垃圾桶失败: ${stderr}`);
          }

          result = {
            content: [
              {
                type: 'text',
                text: '✅ 垃圾桶已成功清理！',
              },
            ],
          };
        } catch (error: any) {
          return NextResponse.json(
            {
              error: `清理垃圾桶时出错: ${error.message}`,
              content: [
                {
                  type: 'text',
                  text: `❌ 清理垃圾桶时出错: ${error.message}`,
                },
              ],
              isError: true,
            },
            { status: 500 }
          );
        }
        break;
      }

      case 'list_directory': {
        try {
          const { path: dirPath } = args || {};
          if (!dirPath) {
            return NextResponse.json(
              { error: '缺少必需参数: path' },
              { status: 400 }
            );
          }

          // 读取目录内容
          const entries = await readdir(dirPath);

          // 获取每个条目的详细信息
          const items = await Promise.all(
            entries.map(async (entry) => {
              const fullPath = join(dirPath, entry);
              const stats = await stat(fullPath);
              return {
                name: entry,
                type: stats.isDirectory() ? '文件夹' : '文件',
                size: stats.isFile() ? `${(stats.size / 1024).toFixed(2)} KB` : '-',
                modified: stats.mtime.toLocaleString('zh-CN'),
              };
            })
          );

          // 按类型排序：文件夹在前，文件在后
          items.sort((a, b) => {
            if (a.type === '文件夹' && b.type === '文件') return -1;
            if (a.type === '文件' && b.type === '文件夹') return 1;
            return a.name.localeCompare(b.name);
          });

          // 格式化输出
          let output = `📁 目录：${dirPath}\n\n`;
          output += `共找到 ${items.length} 个项目：\n\n`;

          items.forEach((item, index) => {
            const icon = item.type === '文件夹' ? '📂' : '📄';
            output += `${index + 1}. ${icon} ${item.name}\n`;
            output += `   类型: ${item.type}`;
            if (item.type === '文件') {
              output += ` | 大小: ${item.size}`;
            }
            output += ` | 修改时间: ${item.modified}\n\n`;
          });

          // 生成图表配置
          const chartConfigs = [
            {
              id: 'type-distribution',
              type: 'pie',
              title: '📊 文件类型分布',
              dataSource: {
                field: 'type',
                aggregate: 'count',
              },
              options: {
                aspectRatio: 1.5,
                legend: { position: 'bottom' },
              },
            },
            {
              id: 'size-distribution',
              type: 'bar',
              title: '📈 文件大小分布',
              dataSource: {
                field: 'size',
                filter: {
                  __function__: true,
                  __source__: '(item) => item.type === "文件" && item.size !== "-"',
                },
                transform: {
                  __function__: true,
                  __source__: '(sizeStr) => { const match = sizeStr.match(/([\\d.]+)\\s*(KB|MB)/); if (match) { const value = parseFloat(match[1]); return match[2] === "MB" ? value * 1024 : value; } return 0; }',
                },
                bins: [
                  { label: '0-1 KB', min: 0, max: 1 },
                  { label: '1-10 KB', min: 1, max: 10 },
                  { label: '10-100 KB', min: 10, max: 100 },
                  { label: '100 KB-1 MB', min: 100, max: 1024 },
                  { label: '>1 MB', min: 1024, max: Infinity },
                ],
              },
              options: {
                aspectRatio: 2,
                legend: { display: false },
              },
            },
          ];

          result = {
            content: [
              {
                type: 'text',
                text: output,
              },
            ],
            items, // 结构化数据
            chartConfigs, // 图表配置
          };
        } catch (error: any) {
          return NextResponse.json(
            {
              error: `读取目录时出错: ${error.message}`,
              content: [
                {
                  type: 'text',
                  text: `❌ 读取目录时出错: ${error.message}`,
                },
              ],
              isError: true,
            },
            { status: 500 }
          );
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `未知工具: ${toolName}` },
          { status: 404 }
        );
    }

    // 保存结果到文件
    try {
      const savedFilename = await saveResult(toolName, args, result);
      result.savedFile = savedFilename;
      result.savedPath = join('results', savedFilename);
    } catch (saveError: any) {
      console.error('保存结果失败:', saveError);
      // 即使保存失败，也返回结果
    }

    // 序列化函数后返回
    const serializedResult = serializeFunctions(result);
    return NextResponse.json(serializedResult);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
