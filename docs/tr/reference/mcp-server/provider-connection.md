---
title: Bağlantı Modları — Sağlayıcılar için LenserFight MCP Sunucusu
description: Üçüncü taraf bir ürünü LenserFight MCP sunucusuna bağlama kılavuzu. LF Cloud (HTTP), stdio (yerel geliştirme) ve gerçek yapılandırma örnekleriyle HTTP + ngrok tünel modlarını kapsar.
---

# Bağlantı Modları

Bu kılavuz, desteklenen her bağlantı modu için LenserFight MCP sunucusunu ürününüze nasıl entegre edeceğinizi gösterir. Dağıtım (deployment) ortamınıza en uygun modu seçin.

| Mod | Ne zaman kullanılır | Kurulum süresi | Yerel depo gerekir mi? |
|---|---|---|---|
| [LF Cloud (HTTP)](#lf-cloud-http) | Üretim — ürününüz barındırılan uç noktaya bağlanır | ~5 dk | Hayır |
| [stdio](#stdio-yerel-gelistirme) | LenserFight deposu içinde yerel geliştirme | ~5 dk | Evet |
| [HTTP + tünel](#http-tunel-yerel-gelistirme) | Dağıtımdan önce yerel MCP değişikliklerini test etme | ~10 dk | Evet |

---

## LF Cloud (HTTP)

**Tüm üretim entegrasyonları için bunu kullanın.**

LenserFight MCP sunucusu bir Supabase Edge Function olarak çalışır. Dağıtılacak veya sürdürülecek ayrı bir sunucu yoktur. İstemciniz HTTPS üzerinden standart MCP JSON-RPC istekleri gönderir.

### Uç nokta (Endpoint)

```
https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/mcp
```

### OAuth keşfi (Uyumlu istemciler için otomatik)

MCP standartlarına tam uyumlu bir istemci keşif belgesini okur ve OAuth işlemlerini otomatik olarak gerçekleştirir:

```bash
curl https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/.well-known/oauth-authorization-server
```

```json
{
  "issuer": "https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp",
  "authorization_endpoint": "https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/oauth/authorize",
  "token_endpoint": "https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/oauth/token",
  "registration_endpoint": "https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/oauth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none"]
}
```

### Claude.ai özel bağlayıcı

1. **claude.ai → Ayarlar → Bağlayıcılar → Özel bağlayıcı ekle** yolunu izleyin.
2. Bilgileri doldurun:
   - **Adı (Name):** `LenserFight`
   - **Uzak MCP sunucu URL'si (Remote MCP server URL):** `https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/mcp`
   - **OAuth İstemci Kimliği (OAuth Client ID):** boş bırakın (dinamik kayıt)
   - **OAuth İstemci Parolası (OAuth Client Secret):** boş bırakın (yalnızca PKCE — parola yok)
3. **Ekle (Add)** seçeneğine tıklayın.
4. Açılan pencerede LenserFight kimlik bilgilerinizle yetkilendirme işlemini tamamlayın.

### Cursor

`~/.cursor/mcp.json` dosyasında (veya proje dizininizin kökündeki projeye özel `.mcp.json` dosyasında):

```json
{
  "mcpServers": {
    "lenserfight": {
      "url": "https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/mcp"
    }
  }
}
```

Cursor uygulamasını yeniden başlatın. Bir LenserFight aracını ilk kez kullandığınızda Cursor, OAuth akışı için bir tarayıcı penceresi açacaktır.

### Herhangi bir HTTP MCP istemcisi

Yukarıdaki uç noktayı gösteren uzak bir MCP sunucu girdisi ekleyin. İstemci şunları desteklemelidir:
- OAuth 2.1 yetkilendirme kodu (authorization code) akışı
- PKCE (S256 kod sınaması)
- RFC 7591 dinamik istemci kaydı (veya önceki bir kayıttan elde edilen bir `client_id` değerini manuel olarak girmek)

İstemciniz dinamik kaydı desteklemiyorsa, `POST /oauth/register` isteğini bir kez manuel olarak gönderin (bkz. [OAuth ve Kimlik Doğrulama](./provider-oauth)) ve dönen `client_id` değerini uygulamanıza sabit olarak (hard-code) kodlayın.

### Özel arka uç istemci örneği (Node.js)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const transport = new StreamableHTTPClientTransport(
  new URL('https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/mcp'),
  {
    // OAuth akışını tamamladıktan sonra lf_mcp_* erişim jetonunu buraya girin
    requestInit: {
      headers: { Authorization: `Bearer ${process.env.LF_MCP_TOKEN}` },
    },
  }
)

const client = new Client({ name: 'my-product', version: '1.0.0' }, { capabilities: {} })
await client.connect(transport)

const result = await client.callTool({ name: 'lens_list', arguments: { limit: 10 } })
console.log(result)
```

---

## stdio (yerel geliştirme)

**Bunu yalnızca LenserFight deposu içinde geliştirme yaparken kullanın.**

stdio modunda, MCP sunucusu bir alt süreç (child process) olarak başlatılır. İletişim stdin/stdout üzerinden gerçekleşir. Service role anahtarı tüm RLS korumalarını atlar — bu mod **üretim kullanımı için güvenli değildir**.

### Ön koşullar

1. Çalışan bir yerel Supabase örneği: `supabase start`
2. Derlenmiş MCP sunucusu: `pnpm nx build mcp-server`
3. Node.js 22+, pnpm 9+

### Ortam değişkenleri

| Değişken | Değer |
|---|---|
| `SUPABASE_URL` | `http://127.0.0.1:54321` |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase status -o env` komutundan alınır |
| `SUPABASE_ANON_KEY` | `supabase status -o env` komutundan alınır |
| `SUPABASE_JWT_SECRET` | `super-secret-jwt-token-with-at-least-32-characters-long` |
| `MCP_TRANSPORT` | `stdio` |
| `LENSERFIGHT_LENSER_ID` | *(isteğe bağlı)* Çağrıların sınırlandırılacağı lenser'ın UUID'si |

### `.mcp.json` (zaten depo kök dizininde mevcuttur)

```json
{
  "mcpServers": {
    "lenserfight": {
      "command": "node",
      "args": ["dist/apps/mcp-server/main.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}",
        "SUPABASE_ANON_KEY": "${SUPABASE_ANON_KEY}",
        "SUPABASE_JWT_SECRET": "${SUPABASE_JWT_SECRET}",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Ortam değişkenlerinizi yükleyin (`source` edin), ardından depo kök dizininden Claude Code veya Cursor uygulamasını açın. İstemci `.mcp.json` dosyasını otomatik olarak okuyacaktır.

---

## HTTP + tünel (yerel geliştirme)

**Claude.ai veya uzak bir istemcinin yerel MCP sunucu değişikliklerinize erişmesini istediğinizde bunu kullanın.**

> Claude.ai'nin jeton değişimi Anthropic bulut altyapısından gerçekleşir. `localhost` adresine erişemez. Genel bir tünel (public tunnel) kurmanız gerekir.

### Adım 1 — ngrok uygulamasını başlatın

```bash
ngrok http 3001
# Yönlendirme: https://<id>.ngrok-free.app -> http://localhost:3001
```

Sunucu, ngrok'un yerel API'sinden ngrok genel URL'sini otomatik olarak algılar. Manuel kopyalama/yapıştırma gerekmez.

Bunun yerine cloudflared kullanmak isterseniz:
```bash
cloudflared tunnel --url http://localhost:3001
export MCP_OAUTH_BASE_URL=https://<your-id>.trycloudflare.com
```

### Adım 2 — Sunucuyu HTTP modunda derleyin ve başlatın

Supabase'in çalıştığından ve ortam değişkenlerinin yüklendiğinden emin olun, ardından:

```bash
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=3001
node dist/apps/mcp-server/main.js
```

Başlangıç başlığı:
```
[lenserfight-mcp] auto-detected public tunnel: https://<tunnel>.ngrok-free.app
[lenserfight-mcp] HTTP transport ready on http://localhost:3001/mcp

  ┌─ Local dev OAuth credentials ──────────────────────────────────┐
  │  OAuth Client ID : lf_mcp_client_localdev                      │
  │  Auth method     : PKCE (no client secret required)            │
  │  Server base URL : https://<tunnel>.ngrok-free.app             │
  │                                                                 │
  │  Claude.ai → Settings → Connectors → Add connector:            │
  │    URL       : https://<tunnel>.ngrok-free.app/mcp             │
  │    Client ID : lf_mcp_client_localdev                          │
  └─────────────────────────────────────────────────────────────────┘
```

### Adım 3 — Claude.ai'de bağlayıcıyı ekleyin

`localhost` yerine başlangıç başlığındaki tünel URL'sini kullanın:
- **URL:** `https://<tunnel>.ngrok-free.app/mcp`
- **OAuth Client ID:** `lf_mcp_client_localdev`

### ngrok uygulamasını yeniden başlattıktan sonra

Ücretsiz ngrok katmanı, her yeniden başlatmada yeni bir URL atar. Her yeniden başlatmadan sonra:
1. MCP sunucusunu yeniden başlatın — yeni URL'yi otomatik olarak algılar.
2. Claude.ai'de bağlayıcıyı silin ve güncellenmiş URL ile yeniden ekleyin.

---

## Sorun Giderme

### `mcp_token_exchange_failed`

Keşif belgesi, uzak istemcinin erişemeyeceği bir yerel ana bilgisayar (localhost) URL'si sundu.

- Başlangıç başlığının `http://localhost` değil, **tünel URL'sini** gösterdiğini doğrulayın.
- Claude.ai'deki bağlayıcı URL'sinin `/mcp` ile bittiğini ve tünel URL'siyle tam olarak eşleştiğini doğrulayın.
- ngrok uygulamasını yeniden başlattıysanız URL değişmiştir — bağlayıcıyı silip yeniden ekleyin.

### `POST /mcp` isteğinde `401 Unauthorized`

- Taşıyıcı jeton (bearer token) eksik, süresi dolmuş veya hatalı biçimlendirilmiş.
- Bağlayıcı ayarlarından yeniden yetkilendirme yapın.
- Jeton biçiminin `lf_mcp_<64 onaltılık karakter>` olduğunu kontrol edin.

### `Sign-in failed`

- OAuth giriş formunda yanlış e-posta veya şifre girildi.
- [lenserfight.com](https://lenserfight.com) adresinden kimlik bilgilerinizi doğrulayın.

### `No Lenser profile found`

- Kullanıcı hesap oluşturma işlemini tamamladı ancak katılım adımlarını (kullanıcı adı seçimi) bitirmedi.
- Kullanıcı adı seçim adımını tamamlaması için kullanıcıyı [lenserfight.com](https://lenserfight.com) adresine yönlendirin ve ardından yeniden deneyin.

### Başlangıçta `PUBLIC URL REQUIRED` uyarısı (tünel modu)

- ngrok çalışmıyor veya MCP sunucusundan önce başlatılmadı.
- Önce ngrok'u, ardından MCP sunucusunu başlatın.
- Veya başlatmadan önce `MCP_OAUTH_BASE_URL=https://sizin-urlniz` değerini manuel olarak ayarlayın.

### `WARN: environment variable is unset`

- Ortam değişkenleri yüklenmedi. `source ./.env.mcp.local` komutunu çalıştırın.
