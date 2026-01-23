'use client';

import { useState } from 'react';

interface ToolResult {
  content?: Array<{ type: string; text: string }>;
  chartConfigs?: any[];
  isError?: boolean;
  error?: string;
}

export default function Home() {
  const [result, setResult] = useState<ToolResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTrend, setShowTrend] = useState(false);

  const callTool = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          toolName: 'analyze_volume',
          args: { showTrend }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `请求失败 (${response.status})`);
      }

      setResult(data);
    } catch (error: any) {
      setResult({
        isError: true,
        content: [{ type: 'text', text: `❌ 错误：${error.message}` }],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>📊 货量分析工具</h1>
        <p className="subtitle">查询和分析货量数据</p>
      </header>

      <div className="tools-grid">
        <div className="tool-card">
          <div className="tool-header">
            <h2>🔍 货量分析</h2>
            <p className="tool-description">查询货量数据并进行分析</p>
          </div>
          <div className="tool-body">
            <div className="input-group">
              <label>
                <input
                  type="checkbox"
                  checked={showTrend}
                  onChange={(e) => setShowTrend(e.target.checked)}
                />
                <span style={{ marginLeft: '8px' }}>展示走势图</span>
              </label>
            </div>
            <button
              className="btn btn-primary"
              onClick={callTool}
              disabled={loading}
            >
              {loading ? '查询中...' : '查询货量'}
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
              <p style={{ marginTop: '15px', color: '#666' }}>正在查询货量数据...</p>
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
              ) : (
                <div className="result-success">
                  <div className="result-content">
                    {result.content?.[0]?.text}
                  </div>
                  {result.chartConfigs && result.chartConfigs.length > 0 && (
                    <div style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                      <p><strong>📈 图表配置：</strong></p>
                      <pre style={{ background: '#fff', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        {JSON.stringify(result.chartConfigs, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="result-placeholder">
              <p>👆 点击上方按钮查询货量数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
