# Platform Compatibility Documentation

> **Status**: Expected to work based on technical analysis. Real-world testing in progress.
>
> **Last Updated**: 2025-02-26
>
> **Testing Contributors**: Community contributors welcome

---

## Quick Reference

| Platform | Web         | Desktop (Win) | Desktop (macOS) | Mobile (iOS) | Mobile (Android) | Overall Status      |
| -------- | ----------- | ------------- | --------------- | ------------ | ---------------- | ------------------- |
| Telegram | ✅ Expected | ✅ Expected   | ✅ Expected     | ✅ Expected  | ✅ Expected      | ✅ Fully Compatible |
| WhatsApp | ⚠️ Partial  | ⚠️ Partial    | ⚠️ Partial      | ⚠️ Partial   | ⚠️ Partial       | ⚠️ Partial Support  |
| Discord  | ✅ Expected | ✅ Expected   | ✅ Expected     | ✅ Expected  | ✅ Expected      | ✅ Fully Compatible |
| Slack    | ✅ Expected | ✅ Expected   | ✅ Expected     | ✅ Expected  | ✅ Expected      | ✅ Fully Compatible |
| Signal   | ✅ Expected | ❓ Untested   | ❓ Untested     | ✅ Expected  | ✅ Expected      | ✅ Fully Compatible |

**Legend**:

- ✅ Expected: Technical analysis indicates full compatibility
- ⚠️ Partial: Works with known limitations or workarounds required
- ❓ Untested: Not yet tested or insufficient data

---

## Technical Requirements

VoidVault requires the following webview capabilities:

| Requirement                   | Description                     | Why It Matters              |
| ----------------------------- | ------------------------------- | --------------------------- |
| **Web Crypto API**            | AES-GCM encryption/decryption   | Client-side file decryption |
| **URL Fragment Preservation** | `#key=...` must not be stripped | Decryption key transport    |
| **Blob Downloads**            | Binary file download handling   | Encrypted file delivery     |
| **User Interaction**          | Button clicks, form inputs      | Download trigger            |
| **Fetch API**                 | HTTP requests to backend        | Metadata & file retrieval   |

---

## Primary Platforms (In-Depth Analysis)

### 1. Telegram

**Technical Analysis**: ✅ **FULLY COMPATIBLE**

**Architecture**:

- **Web App**: Chromium-based
- **Desktop**: Electron (Chromium-based)
- **Mobile**: Native app with modern webview

**Compatibility Breakdown**:

| Environment       | Web Crypto API    | URL Fragment | Blob Downloads  | User Interaction | Status      |
| ----------------- | ----------------- | ------------ | --------------- | ---------------- | ----------- |
| Web App           | ✅ Native support | ✅ Preserved | ✅ Full support | ✅ Native        | ✅ Expected |
| Desktop (Windows) | ✅ Native support | ✅ Preserved | ✅ Full support | ✅ Native        | ✅ Expected |
| Desktop (macOS)   | ✅ Native support | ✅ Preserved | ✅ Full support | ✅ Native        | ✅ Expected |
| Mobile (iOS)      | ✅ Native support | ✅ Preserved | ✅ Full support | ✅ Native        | ✅ Expected |
| Mobile (Android)  | ✅ Native support | ✅ Preserved | ✅ Full support | ✅ Native        | ✅ Expected |

**Known Features**:

- `downloadFile()` API available for native download popup (Bot API 8.0+)
- Link previews preserve URL fragments
- No aggressive content filtering

**Testing Checklist** (for contributors):

- [ ] Upload file from Telegram Web App
- [ ] Share link in Telegram chat
- [ ] Click link from Telegram (all platforms)
- [ ] Verify decryption key present in URL
- [ ] Download file successfully
- [ ] Verify file integrity after decryption

**Real-World Testing Status**:

- _Awaiting community test results_

---

### 2. WhatsApp

**Technical Analysis**: ⚠️ **PARTIAL COMPATIBILITY**

**Architecture**:

- **Web App**: Web-based (requires phone connection)
- **Desktop**: Electron (based on system webview)
- **Mobile**: Native app with custom webview

**Compatibility Breakdown**:

| Environment       | Web Crypto API | URL Fragment       | Blob Downloads      | User Interaction  | Status     |
| ----------------- | -------------- | ------------------ | ------------------- | ----------------- | ---------- |
| Web App           | ✅ Supported   | ⚠️ May be stripped | ⚠️ External browser | ✅ After redirect | ⚠️ Partial |
| Desktop (Windows) | ✅ Supported   | ⚠️ May be stripped | ⚠️ External browser | ✅ After redirect | ⚠️ Partial |
| Desktop (macOS)   | ✅ Supported   | ⚠️ May be stripped | ⚠️ External browser | ✅ After redirect | ⚠️ Partial |
| Mobile (iOS)      | ✅ Supported   | ⚠️ Likely stripped | ⚠️ External browser | ✅ After redirect | ⚠️ Partial |
| Mobile (Android)  | ✅ Supported   | ⚠️ Likely stripped | ⚠️ External browser | ✅ After redirect | ⚠️ Partial |

**Known Limitations**:

1. **URL Fragment Stripping**: WhatsApp's link preview system may strip `#key=...` from URLs when generating previews
2. **External Browser Redirect**: Often opens links in system browser instead of in-app webview
3. **Aggressive Link Previews**: Metadata fetching may interfere with URL fragment

**Impact on VoidVault**:

- If URL fragment is stripped → Decryption key lost → **Download fails**
- If redirected to external browser → **Works normally** (external browsers preserve fragments)

**Workarounds**:

1. **Copy Full Link**: Instruct recipients to "Copy Link" instead of clicking preview
2. **"Open in Browser" Button**: UI feature to guide users (planned for Phase 2)
3. **Share with Context**: Add note when sharing - "Open this link directly in browser"

**Testing Checklist** (for contributors):

- [ ] Share link in WhatsApp chat
- [ ] Observe link preview generation
- [ ] Click link from WhatsApp preview
- [ ] Check if URL fragment is preserved
- [ ] Test download (success/failure)
- [ ] Try "Copy Link" → paste in browser manually
- [ ] Compare results across platforms

**Real-World Testing Status**:

- _Awaiting community test results_

---

## Secondary Platforms (Expected Compatibility)

### 3. Discord

**Technical Analysis**: ✅ **FULLY COMPATIBLE**

**Architecture**: Electron-based (Chromium) across all platforms

**Expected Compatibility**:

- Web Crypto API: ✅ Native support
- URL Fragment: ✅ Preserved
- Blob Downloads: ✅ Full support
- User Interaction: ✅ Native

**Notes**: Discord's embedded browser is based on Chromium, providing full modern web APIs support.

**Real-World Testing Status**: _Awaiting community test results_

---

### 4. Slack

**Technical Analysis**: ✅ **FULLY COMPATIBLE**

**Architecture**: Electron-based (Chromium) across all platforms

**Expected Compatibility**:

- Web Crypto API: ✅ Native support
- URL Fragment: ✅ Preserved
- Blob Downloads: ✅ Full support
- User Interaction: ✅ Native

**Notes**: Similar to Discord, Slack uses Electron for desktop apps with Chromium webview.

**Real-World Testing Status**: _Awaiting community test results_

---

### 5. Signal

**Technical Analysis**: ✅ **EXPECTED COMPATIBLE**

**Architecture**: Native apps with system webview components

**Expected Compatibility**:

- Web Crypto API: ✅ Modern system webviews
- URL Fragment: ✅ Less aggressive preview (Signal philosophy)
- Blob Downloads: ✅ Supported
- User Interaction: ✅ Native

**Notes**: Signal's privacy-focused approach means less aggressive link preview processing.

**Real-World Testing Status**: _Awaiting community test results_

---

## Untested Platforms

The following platforms have not been analyzed or tested:

- [ ] Facebook Messenger
- [ ] Instagram DM
- [ ] Line
- [ ] Viber
- [ ] WeChat
- [ ] Telegram X (alternative client)
- [ ] WhatsApp Business

_Community contributions welcome!_

---

## Test Methodology

### How to Test

1. **Setup**:
   - Deploy VoidVault instance
   - Upload test file (small, < 1MB)
   - Generate shareable link with decryption key

2. **Test Scenarios**:
   - Share link in target platform
   - Click link from platform (in-app webview)
   - Observe URL fragment preservation
   - Attempt download
   - Verify decrypted file integrity

3. **Document Results**:
   - Platform & version
   - Device/OS details
   - Success/failure indicators
   - Screenshots (if applicable)
   - Workarounds used (if any)

### Test Result Template

```markdown
### [Platform Name] - [Environment]

**Test Date**: YYYY-MM-DD
**Tester**: @username
**Device**: [Device Model]
**OS**: [OS Version]
**App Version**: [Version]

**Test Scenarios**:

- [ ] Link sharing successful
- [ ] URL fragment preserved
- [ ] In-app webview opened
- [ ] Download button clickable
- [ ] File downloaded successfully
- [ ] File decrypted correctly
- [ ] File integrity verified

**Results**:
[Detailed observations]

**Issues Encountered**:
[If any]

**Workarounds Used**:
[If any]

**Verdict**: ✅ Pass / ⚠️ Partial / ❌ Fail
```

---

## Known Issues & Limitations

### URL Fragment Stripping

**Affected Platforms**: WhatsApp, possibly Facebook Messenger, Instagram DM

**Symptom**: Decryption fails after clicking link from chat

**Root Cause**: Platform's link preview system strips `#key=...` from URL

**Workaround**:

- Method 1: Copy full link instead of clicking preview
- Method 2: Open in external browser manually
- Method 3: Use "Open in Browser" button (planned)

**Detection**: User sees "Missing decryption key" error on download page

---

### External Browser Redirect

**Affected Platforms**: WhatsApp, Facebook Messenger

**Symptom**: Link opens in Chrome/Firefox/Safari instead of in-app webview

**Impact**:

- **Positive**: Full compatibility (external browsers work perfectly)
- **Negative**: Context switch (user leaves messaging app)

**Verdict**: Not a critical issue, but affects UX

---

## Future Roadmap

### Planned Testing (Priority Order)

1. ✅ Telegram (all environments) - **HIGH PRIORITY**
2. ✅ WhatsApp (all environments) - **HIGH PRIORITY**
3. Discord (all environments)
4. Slack (all environments)
5. Signal (mobile focus)

### Planned Improvements

- [ ] Phase 2: Graceful degradation UI (detect missing key, show "Open in Browser" button)
- [ ] Platform detection (show tailored instructions per platform)
- [ ] Analytics integration (track which platforms users download from)
- [ ] Community testing dashboard

---

## Contributing Test Results

We welcome community contributions to expand our compatibility testing!

### How to Contribute

1. **Test on your platform**: Follow the test methodology above
2. **Document results**: Use the test result template
3. **Submit PR**: Add your results to this document
4. **Update summary table**: Mark platform as tested

### Review Process

- Test results will be reviewed by maintainers
- Screenshots/videos encouraged but not required
- Conflicting results will be investigated
- Status updates require verification from 2+ contributors

---

## Changelog

- **2025-02-26**: Initial documentation based on technical analysis

---

## References

- [Web Crypto API Browser Support](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [URL Fragment Specification](https://www.rfc-editor.org/rfc/rfc3986#section-3.5)

---

_Last Updated: 2025-02-26_
_Status: Expected compatibility based on technical analysis - real-world testing in progress_
