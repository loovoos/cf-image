# cf-Image API 文档

图床服务 API 接口文档，支持跨域调用。

---

## 基础信息

| 项目 | 说明 |
|------|------|
| Base URL | `https://your-domain.com` |
| 协议 | HTTPS |
| 跨域 | 支持 CORS |
| 认证 | 部分接口需要登录 |

---

## 公开接口

### 1. 统一上传接口

上传文件到 TG_Channel 或 R2 存储。

```
POST /api/upload
```

**请求头**
```
Content-Type: multipart/form-data
```

**请求参数**

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `file` | body | File | ✅ | 上传的文件 |
| `storage` | body/query | String | ❌ | 存储类型：`tgchannel`(默认) 或 `r2` |

**请求示例**

```javascript
// JavaScript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('storage', 'r2');

const res = await fetch('https://your-domain.com/api/upload', {
  method: 'POST',
  body: formData
});
const data = await res.json();
```

```bash
# cURL
curl -X POST https://your-domain.com/api/upload \
  -F "file=@/path/to/image.png" \
  -F "storage=tgchannel"
```

```python
# Python
import requests

files = {'file': open('image.png', 'rb')}
data = {'storage': 'r2'}
response = requests.post('https://your-domain.com/api/upload', files=files, data=data)
print(response.json())
```

**成功响应**
```json
{
  "code": 200,
  "success": true,
  "url": "https://your-domain.com/api/cfile/AgACAgUAAxk...",
  "name": "image.png",
  "storage": "tgchannel"
}
```

**错误响应**
```json
{
  "code": 400,
  "success": false,
  "message": "缺少文件参数"
}
```

**错误码**

| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 500 | 服务器错误 |

---

### 2. 获取客户端 IP

```
GET /api/ip
```

**响应**
```json
{
  "ip": "123.45.67.89"
}
```

---

### 3. 获取图片总数

```
GET /api/total
```

**响应**
```json
{
  "total": 1234
}
```

---

## 文件访问接口

### 4. 访问 TG 图片

```
GET /api/file/{name}
GET /api/cfile/{file_id}
```

**参数**

| 参数 | 说明 |
|------|------|
| `name` | Telegraph 文件路径 |
| `file_id` | Telegram 文件 ID |

**响应**

返回图片/文件内容（二进制）

---

### 5. 访问 R2 图片

```
GET /api/rfile/{filename}
```

**参数**

| 参数 | 说明 |
|------|------|
| `filename` | R2 存储的文件名 |

**响应**

返回图片/文件内容（二进制）

---

## 需认证接口

以下接口需要登录后访问（Cookie 认证）。

### 6. 检查认证状态

```
GET /api/enableauthapi/isauth
```

**响应（已登录）**
```json
{
  "role": "admin"
}
```

**响应（未登录）**

HTTP 401

---

### 7. TG Channel 上传（需认证）

```
POST /api/enableauthapi/tgchannel
```

与统一上传接口参数相同，仅接受 `file` 字段。

---

### 8. R2 上传（需认证）

```
POST /api/enableauthapi/r2
```

与统一上传接口参数相同，仅接受 `file` 字段。

---

## 管理接口

需要管理员权限（`role: admin`）。

### 9. 图片列表

```
POST /api/admin/list
```

**请求体**
```json
{
  "page": 0,
  "query": ""
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | Number | 页码，从 0 开始 |
| `query` | String | 搜索关键词（可选） |

**响应**
```json
{
  "code": 200,
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "/cfile/xxx",
      "referer": "https://example.com",
      "ip": "1.2.3.4",
      "rating": 0,
      "total": 1,
      "time": "2024年1月1日 12:00:00"
    }
  ],
  "page": 0,
  "total": 100
}
```

---

### 10. 删除图片记录

```
DELETE /api/admin/delete
```

**请求体**
```json
{
  "name": "/cfile/xxx"
}
```

**响应**
```json
{
  "code": 200,
  "success": true,
  "message": true
}
```

---

### 11. 封禁/解封图片

```
PUT /api/admin/block
```

**请求体**
```json
{
  "name": "/cfile/xxx",
  "rating": 5
}
```

| rating | 说明 |
|--------|------|
| 0 | 正常 |
| 5 | 封禁 |

---

### 12. 日志查询

```
POST /api/admin/log
```

---

### 13. 管理员 IP 查询

```
GET /api/admin/ip
```

---

## 环境变量配置

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `SECRET` | ✅ | JWT 签名密钥 |
| `BASIC_USER` | ✅ | 管理员用户名 |
| `BASIC_PASS` | ✅ | 管理员密码 |
| `REGULAR_USER` | ❌ | 普通用户名 |
| `REGULAR_PASS` | ❌ | 普通用户密码 |
| `ENABLE_AUTH_API` | ❌ | 是否启用认证 API（`true`/`false`） |
| `TG_BOT_TOKEN` | ❌ | Telegram Bot Token |
| `TG_CHAT_ID` | ❌ | Telegram 频道/群组 ID |
| `CUSTOM_DOMAIN` | ❌ | 自定义域名 |
| `ModerateContentApiKey` | ❌ | 内容审核 API Key |
| `RATINGAPI` | ❌ | 自定义审核 API 地址 |

**Cloudflare 绑定**

| 绑定名 | 类型 | 说明 |
|--------|------|------|
| `IMG` | D1 Database | 图片记录数据库 |
| `IMGRS` | R2 Bucket | R2 存储桶 |

---

## 数据库表结构

```sql
CREATE TABLE imginfo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  referer TEXT,
  ip TEXT,
  rating INTEGER DEFAULT 0,
  total INTEGER DEFAULT 1,
  time TEXT
);
```
