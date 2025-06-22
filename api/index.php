<?php
header('Access-Control-Allow-Origin: *');
header("Cache-Control: public, max-age=3600"); // 缓存1小时

$externalSource = 'https://raw.githubusercontent.com/xiaoka520/ListFX-API/main/photos.txt';
$localFile = __DIR__ . '/../photos.txt';

// 尝试从 GitHub 源加载
$content = @file_get_contents($externalSource, false, stream_context_create([
    'http' => [
        'timeout' => 3, // 3秒超时
        'user_agent' => 'Vercel-PHP-Image-API/1.0' // 添加 UA 避免被 GitHub 限制
    ]
]));

// 外部源失败时使用本地备份
if ($content === false && file_exists($localFile)) {
    $content = file_get_contents($localFile);
}

if ($content === false || empty($content)) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Image source unavailable', 'code' => 503]);
    exit;
}

$links = array_filter(
    array_map('trim', explode("\n", $content)),
    function($url) {
        // 验证是否为合法 webp 图片链接
        return !empty($url) && 
               (strpos($url, 'https://cdn.jsdelivr.net/gh/') === 0 ||
                strpos($url, 'https://raw.githubusercontent.com/') === 0) &&
               filter_var($url, FILTER_VALIDATE_URL) &&
               preg_match('/\.webp($|\?)/i', $url); // 匹配 .webp 或带查询参数
    }
);

if (empty($links)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'No valid WebP image links found', 'code' => 404]);
} else {
    // 随机选择并添加缓存破坏参数
    $randomImageLink = $links[array_rand($links)];
    $cacheBuster = '?v=' . date('Ymd'); // 每天清除缓存
    
    header("Location: " . $randomImageLink . $cacheBuster);
    exit;
}
?>
