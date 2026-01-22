'use client';

import { useState, useEffect } from 'react';

interface ToolResult {
  content?: Array<{ type: string; text: string }>;
  items?: Array<{
    name: string;
    type: string;
    size: string;
    modified: string;
  }>;
  chartConfigs?: any[];
  savedFile?: string;
  savedPath?: string;
  isError?: boolean;
  error?: string;
}

interface ResultFile {
  filename: string;
  path: string;
  size: string;
  modified: string;
}

export default function Home() {
  const [helloName, setHelloName] = useState('');
  const [directoryPath, setDirectoryPath] = useState('/Users/tenglinqiang/Documents');
  const [result, setResult] = useState<ToolResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyResults, setHistoryResults] = useState<ResultFile[]>([]);

  // 加载历史结果
  useEffect(() => {
    loadHistoryResults();
  }, []);

  const loadHistoryResults = async () => {
    try {
      const response = await fetch('/api/results');
      const data = await response.json();
      if (data.results) {
        setHistoryResults(data.results);
      }
    } catch (error) {
      console.error('加载历史结果失败:', error);
    }
  };

  const callTool = async (toolName: string, args: any) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toolName, args }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `请求失败 (${response.status})`);
      }

      setResult(data);
      // 重新加载历史结果
      loadHistoryResults();
    } catch (error: any) {
      setResult({
        isError: true,
        content: [{ type: 'text', text: `❌ 错误：${error.message}` }],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHelloSubmit = () => {
    if (helloName.trim()) {
      callTool('hello', { name: helloName });
    }
  };

  const handleDirectorySubmit = () => {
    if (directoryPath.trim()) {
      callTool('list_directory', { path: directoryPath });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter') {
      callback();
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🔧 MCP 工具面板</h1>
        <p className="subtitle">简单易用的 MCP 工具 Web 界面</p>
      </header>

      <div className="tools-grid">
        {/* Hello 工具 */}
        <div className="tool-card">
          <div className="tool-header">
            <h2>👋 Hello</h2>
            <p className="tool-description">向指定的人打招呼</p>
          </div>
          <div className="tool-body">
            <div className="input-group">
              <label htmlFor="hello-name">名字：</label>
              <input
                type="text"
                id="hello-name"
                placeholder="请输入名字"
                className="input"
                value={helloName}
                onChange={(e) => setHelloName(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleHelloSubmit)}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleHelloSubmit}
              disabled={loading}
            >
              执行
            </button>
          </div>
        </div>

        {/* 获取当前时间工具 */}
        <div className="tool-card">
          <div className="tool-header">
            <h2>⏰ 获取当前时间</h2>
            <p className="tool-description">显示当前系统时间</p>
          </div>
          <div className="tool-body">
            <button
              className="btn btn-primary"
              onClick={() => callTool('get_current_time', {})}
              disabled={loading}
            >
              获取时间
            </button>
          </div>
        </div>

        {/* 清理垃圾桶工具 */}
        <div className="tool-card">
          <div className="tool-header">
            <h2>🗑️ 清理垃圾桶</h2>
            <p className="tool-description">清理 macOS 系统垃圾桶</p>
          </div>
          <div className="tool-body">
            <button
              className="btn btn-danger"
              onClick={() => callTool('clean_trash', {})}
              disabled={loading}
            >
              清理垃圾桶
            </button>
          </div>
        </div>

        {/* 查看目录工具 */}
        <div className="tool-card">
          <div className="tool-header">
            <h2>📁 查看目录</h2>
            <p className="tool-description">查看指定文件夹下的项目和文件列表</p>
          </div>
          <div className="tool-body">
            <div className="input-group">
              <label htmlFor="directory-path">路径：</label>
              <input
                type="text"
                id="directory-path"
                placeholder="/Users/username/Documents"
                className="input"
                value={directoryPath}
                onChange={(e) => setDirectoryPath(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleDirectorySubmit)}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleDirectorySubmit}
              disabled={loading}
            >
              查看目录
            </button>
          </div>
        </div>
      </div>

      {/* 结果显示区域 */}
      <div className="result-section">
        <h2>执行结果</h2>
        <div className="result-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="loading"></div>
              <p style={{ marginTop: '15px', color: '#666' }}>正在执行...</p>
            </div>
          ) : result ? (
            <>
              {result.isError || result.error ? (
                <div className="result-error">
                  <strong>❌ 执行失败：</strong>
                  <div className="result-content">
                    {result.content?.[0]?.text || result.error}
                  </div>
                </div>
              ) : result.items ? (
                <>
                  <div className="result-success">
                    <div className="result-content">
                      {result.content?.[0]?.text}
                    </div>
                  </div>
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>名称</th>
                        <th>类型</th>
                        <th>大小</th>
                        <th>修改时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((item, index) => {
                        const icon = item.type === '文件夹' ? '📂' : '📄';
                        return (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>
                              {icon} {item.name}
                            </td>
                            <td>{item.type}</td>
                            <td>{item.size}</td>
                            <td>{item.modified}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="result-success">
                  <div className="result-content">
                    {result.content?.[0]?.text}
                  </div>
                </div>
              )}
              {result.savedFile && (
                <div className="saved-file-info">
                  <strong>💾 结果已保存：</strong>
                  <code>{result.savedPath}</code>
                </div>
              )}
            </>
          ) : (
            <div className="result-placeholder">
              <p>👆 点击上方工具按钮开始使用</p>
            </div>
          )}
        </div>
      </div>

      {/* 历史结果区域 */}
      {historyResults.length > 0 && (
        <div className="result-section">
          <h3>📋 历史结果</h3>
          <table className="result-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th>大小</th>
                <th>修改时间</th>
              </tr>
            </thead>
            <tbody>
              {historyResults.map((item, index) => (
                <tr key={index}>
                  <td>📄 {item.filename}</td>
                  <td>{item.size}</td>
                  <td>{item.modified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
