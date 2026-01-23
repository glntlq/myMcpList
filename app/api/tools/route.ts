import { NextRequest, NextResponse } from 'next/server';

// 将对象中的函数转换为可序列化的格式
function serializeFunctions(obj: unknown): unknown {
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
    const serialized: Record<string, unknown> = {};
    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
        serialized[key] = serializeFunctions(objRecord[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

// 分析货量数据并生成文本报告
function analyzeVolumeData(data: unknown): string {
  let analysis = '## 货量数据分析\n\n';
  
  // 根据实际数据结构进行分析
  // 这里需要根据实际返回的 JSON 结构来调整
  if (data && typeof data === 'object') {
    // 尝试提取关键信息
    if (Array.isArray(data)) {
      analysis += '### 数据概览\n\n';
      analysis += `共获取 ${data.length} 条数据记录。\n\n`;
    } else {
      const dataObj = data as Record<string, unknown>;
      const keys = Object.keys(dataObj);
      
      if (keys.length > 0) {
        analysis += '### 数据概览\n\n';
        
        // 尝试提取数值字段
        const numericFields = keys.filter(key => {
          const value = dataObj[key];
          return typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));
        });
        
        if (numericFields.length > 0) {
          analysis += '**关键指标：**\n\n';
          numericFields.forEach(field => {
            const value = dataObj[field];
            analysis += `- ${field}: ${value}\n`;
          });
          analysis += '\n';
        }
        
        // 如果有其他结构化数据
        if (dataObj.summary || dataObj.total || dataObj.count) {
          analysis += '### 汇总信息\n\n';
          if (dataObj.summary) analysis += `汇总: ${JSON.stringify(dataObj.summary)}\n\n`;
          if (dataObj.total) analysis += `总计: ${dataObj.total}\n\n`;
          if (dataObj.count) analysis += `数量: ${dataObj.count}\n\n`;
        }
      } else {
        analysis += '数据为空或格式异常。\n\n';
      }
    }
  } else {
    analysis += '无法解析数据格式。\n\n';
  }
  
  return analysis;
}


// GET: 获取工具列表
export async function GET() {
  return NextResponse.json(
    {
      tools: [
        {
          name: 'analyze_volume',
          description: '查询货量数据。返回货量汇总信息和原始数据，AI 可以根据数据自行分析和生成图表。',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    }
  );
}

// OPTIONS: 处理 CORS 预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// POST: 调用工具
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolName } = body;

    console.log('🔵 [MCP Tools API] 收到工具调用请求:', {
      toolName,
      hasBody: !!body
    });

    if (!toolName) {
      console.error('❌ [MCP Tools API] 缺少 toolName 参数');
      return NextResponse.json(
        { error: '缺少必需参数: toolName' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    if (toolName !== 'analyze_volume') {
      console.error('❌ [MCP Tools API] 未知工具:', toolName);
      return NextResponse.json(
        { error: `未知工具: ${toolName}` },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    console.log('✅ [MCP Tools API] 开始执行 analyze_volume 工具...');

    // 调用外部接口获取货量数据
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch('http://10.45.35.254/captain/app/volume/portal/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authoritytoken': 'c2a4a96d-b15d-4e89-a312-6475035e1b03'
        },
        body: JSON.stringify({
          type: 'ORG',
          volumeBusinessType: 'ALL',
          volumeType: 'PRECISION'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`接口调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 [MCP Tools API] 获取到外部接口数据:', {
        hasData: !!data,
        dataKeys: data && typeof data === 'object' ? Object.keys(data).slice(0, 10) : []
      });

      // 分析数据并生成文本报告
      const analysis = analyzeVolumeData(data);
      
      // 将原始数据也包含在返回中，供 AI 分析使用
      const dataSummary = JSON.stringify(data, null, 2);

      // 构建返回结果 - 只返回文本分析，不返回图表配置
      const result = {
        content: [
          {
            type: 'text',
            text: `${analysis}\n\n**原始数据：**\n\`\`\`json\n${dataSummary}\n\`\`\``
          }
        ]
      };

      console.log('✅ [MCP Tools API] 工具执行完成，返回结果:', {
        hasContent: !!result.content,
        contentLength: result.content[0]?.text?.length || 0
      });

      // 序列化函数后返回
      const serializedResult = serializeFunctions(result);
      return NextResponse.json(serializedResult, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });

    } catch (error: unknown) {
      // 处理网络错误、超时等
      const err = error as { name?: string; message?: string };
      if (err.name === 'AbortError') {
        return NextResponse.json(
          {
            error: '请求超时，请稍后重试',
            content: [
              {
                type: 'text',
                text: '❌ 获取货量数据超时，请稍后重试。'
              }
            ],
            isError: true
          },
          { 
            status: 408,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            }
          }
        );
      }

      return NextResponse.json(
        {
          error: `获取货量数据失败: ${err.message || '未知错误'}`,
          content: [
            {
              type: 'text',
              text: `❌ 获取货量数据失败: ${err.message || '未知错误'}`
            }
          ],
          isError: true
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || '服务器错误' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}
