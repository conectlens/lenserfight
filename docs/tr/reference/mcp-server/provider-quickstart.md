---
title: Sağlayıcı Hızlı Başlangıç — LenserFight MCP Sunucusu
description: Yapay zeka ürününüzü LenserFight MCP sunucusuna 5 dakikadan kısa sürede bağlayın. Bir istemci kaydedin, OAuth adımlarını tamamlayın ve ilk araç çağrınızı yapın.
---

# Sağlayıcı Hızlı Başlangıç

**Hedef:** MCP uyumlu ürününüzü LenserFight MCP sunucusuna bağlamak, bir kullanıcıyı yetkilendirmek ve başarılı bir `lens_list` çağrısı yapmak — 5 dakikadan kısa sürede.

**İhtiyacınız olanlar:**
- MCP uyumlu bir istemci (Claude.ai, Cursor veya OAuth 2.1 PKCE + RFC 7591 standartlarını uygulayan herhangi bir istemci)
- [lenserfight.com](https://lenserfight.com) adresinde oluşturulmuş ve Lenser kullanıcı adı (handle) seçilmiş bir LenserFight hesabı

---

## Adım 1 — İstemcinizi uç noktaya yönlendirin

LenserFight MCP sunucu, LF Cloud üzerinde barındırılmaktadır. Tek kararlı uç nokta:

```
https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/mcp
```

Bu URL tüm MCP JSON-RPC isteklerini, OAuth keşif (discovery) işlemlerini, jeton değişimlerini ve sağlık kontrollerini yönetir. Ayrı bir temel URL'ye gerek yoktur.

---

## Adım 2 — OAuth istemcinizi kaydedin (otomatik)

LenserFight'a önceden kayıt olmanız gerekmez. İlk bağlantıda istemciniz şu isteği gönderir:

```http
POST https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/oauth/register
Content-Type: application/json

{
  "client_name": "My AI Product",
  "redirect_uris": ["https://myproduct.com/api/mcp/auth_callback"]
}
```

Yanıt:
```json
{
  "client_id": "lf_mcp_client_abc123...",
  "redirect_uris": ["https://myproduct.com/api/mcp/auth_callback"],
  "token_endpoint_auth_method": "none"
}
```

`client_id` değerini kaydedin. Bundan sonraki tüm yetkilendirme isteklerinde kullanın. Çoğu MCP istemci kütüphanesi bu adımı otomatik olarak gerçekleştirir — sizin yalnızca yönlendirme URI'nizi (redirect URI) belirtmeniz gerekir.

---

## Adım 3 — Bir kullanıcıyı yetkilendirin (PKCE akışı)

Bir PKCE kod doğrulayıcısı (code verifier) ve sınaması (challenge) oluşturun, ardından kullanıcıyı şuraya yönlendirin:

```
https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/oauth/authorize
  ?response_type=code
  &client_id=lf_mcp_client_abc123...
  &redirect_uri=https://myproduct.com/api/mcp/auth_callback
  &code_challenge=<S256_hash_of_verifier>
  &code_challenge_method=S256
  &state=<random_csrf_token>
```

Sunucu bir HTML giriş formu görüntüler. Kullanıcı LenserFight e-posta adresini ve şifresini girer.

Başarılı olunduğunda sunucu, `?code=lf_mcp_<hex>&state=<your_state>` parametreleriyle `redirect_uri` adresinize geri yönlendirir.

---

## Adım 4 — Kodu bir jetonla değiştirin

```http
POST https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=lf_mcp_<3. adimdaki kod>
&redirect_uri=https://myproduct.com/api/mcp/auth_callback
&client_id=lf_mcp_client_abc123...
&code_verifier=<orijinal_dogrulayici>
```

Yanıt:
```json
{
  "access_token": "lf_mcp_abc123...",
  "token_type": "bearer"
}
```

`access_token` değerini saklayın. Bu uzun ömürlü bir MCP jetonudur — kullanıcı iptal etmediği sürece süresi dolmaz. Gelecekteki tüm istekler için bu jetonla MCP uç noktasını çağırırsınız.

---

## Adım 5 — İlk araç çağrınızı yapın

```http
POST https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/mcp
Authorization: Bearer lf_mcp_abc123...
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "lens_list",
    "arguments": { "limit": 5 }
  }
}
```

Başarılı yanıt:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"items\":[...],\"total\":42,\"limit\":5,\"offset\":0,\"has_more\":true}"
      }
    ]
  }
}
```

Yanıtta `"items"` alanını görüyorsanız entegrasyonunuz çalışıyor demektir.

---

## Claude.ai örneği (kodsuz)

Eğer ürününüz Claude.ai **ise**:

1. **claude.ai → Ayarlar (Settings) → Bağlayıcılar (Connectors) → Özel bağlayıcı ekle (Add custom connector)** yolunu izleyin.
2. **Remote MCP server URL** alanını şu şekilde ayarlayın:
   ```
   https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/mcp
   ```
3. OAuth Client ID ve Secret alanlarını boş bırakın (dinamik kayıt bu işlemi yönetir).
4. **Ekle (Add)** seçeneğine tıklayın. Açılan pencere belirdiğinde LenserFight kimlik bilgilerinizle giriş yapın.
5. Yeni bir sohbet başlatın ve şunu sorun: *"LenserFight kullanarak lenslerimi listele."*

---

## Cursor / VS Code örneği

MCP yapılandırma dosyanıza ekleyin (örneğin, çalışma alanınızdaki `~/.cursor/mcp.json` veya `.mcp.json`):

```json
{
  "mcpServers": {
    "lenserfight": {
      "url": "https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/mcp"
    }
  }
}
```

Cursor, keşif belgesinden OAuth gereksinimini algılayacak ve bir LenserFight aracını ilk kez çağırdığınızda yetkilendirme akışını başlatacaktır.

---

## Bağlantının sağlıklı olduğunu doğrulama

İstediğiniz zaman:

```bash
curl https://jrjlbycxihqqbwmsmpjn.supabase.co/functions/v1/lenserfight-mcp/health
# {"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

Veya AI asistanınızın içinden:
> "LenserFight bağlantısını kullanarak `limit=1` ile `lens_list` aracını çağır."

---

## Sıradaki adımlar

| Yapmak istediğim… | Git… |
|---|---|
| Tüm bağlantı seçeneklerini anlamak (HTTP, stdio, tünel) | [Bağlantı Modları](./provider-connection) |
| OAuth 2.1 PKCE akışını manuel olarak uygulamak | [OAuth ve Kimlik Doğrulama](./provider-oauth) |
| Mevcut tüm araçları görmek | [31 Aracın Tümü](./provider-tools) |
| Mimariyi ve RLS sistemini anlamak | [Entegrasyon Kılavuzu](./provider-integration) |

---

## Bu aşamada sık karşılaşılan hatalar

| Hata | Nedeni | Çözümü |
|---|---|---|
| `Sign-in failed` | Yanlış e-posta veya şifre | [lenserfight.com](https://lenserfight.com) adresinden kimlik bilgilerinizi doğrulayın |
| `No Lenser profile found` | Hesap var ancak katılım adımları tamamlanmamış | [lenserfight.com](https://lenserfight.com) adresine giriş yapın ve bir kullanıcı adı seçin |
| `401 Unauthorized` | Jeton eksik veya hatalı biçimlendirilmiş | `Authorization: Bearer lf_mcp_...` üst bilgisinin mevcut olduğundan emin olun |
| `mcp_token_exchange_failed` | Keşif belgesi yerel ana bilgisayar (localhost) URL'si sundu | Yalnızca yerel geliştirmede olur; üretim için bulut uç noktasını kullanın |
