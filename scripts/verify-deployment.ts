#!/usr/bin/env bun

/**
 * 部署验证脚本
 * 用于检查部署后的 API 状态和数据
 */

const BASE_URL = process.argv[2] || 'https://spectra-grid.pages.dev';

async function verifyDeployment() {
  console.log(`🚀 验证部署: ${BASE_URL}`);
  console.log(`⏰ 验证时间: ${new Date().toISOString()}`);
  
  // 1. 检查主页
  console.log(`\n1️⃣ 检查主页...`);
  try {
    const homeResponse = await fetch(`${BASE_URL}/`);
    console.log(`   主页状态: ${homeResponse.status} ${homeResponse.statusText}`);
    
    if (homeResponse.ok) {
      const homeText = await homeResponse.text();
      console.log(`   页面大小: ${homeText.length} 字符`);
      console.log(`   ✅ 主页正常`);
    } else {
      console.log(`   ❌ 主页异常`);
    }
  } catch (e) {
    console.log(`   ❌ 主页访问失败:`, e);
  }
  
  // 2. 检查 API
  console.log(`\n2️⃣ 检查 API...`);
  try {
    const apiResponse = await fetch(`${BASE_URL}/api/photos`);
    console.log(`   API 状态: ${apiResponse.status} ${apiResponse.statusText}`);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json() as any[];
      console.log(`   数据条数: ${data.length}`);
      
      if (data.length > 0) {
        const firstPhoto = data[0];
        console.log(`   第一条数据:`);
        console.log(`     ID: ${firstPhoto.id}`);
        console.log(`     文件名: ${firstPhoto.filename}`);
        console.log(`     R2 Key: ${firstPhoto.r2_key}`);
        console.log(`     Thumb Key: ${firstPhoto.thumb_key}`);
        
        // 检查 URL 格式
        const hasValidUrls = firstPhoto.r2_key?.startsWith('http') && 
                           firstPhoto.thumb_key?.startsWith('http');
        console.log(`   URL 格式正确: ${hasValidUrls ? '✅' : '❌'}`);
        
        // 检查数据来源
        const hasTargetIds = data.some((photo: any) => 
          photo.id >= 3250 && photo.id <= 3252
        );
        
        if (hasTargetIds) {
          console.log(`   ✅ 找到目标数据 (ID 3250-3252)`);
          console.log(`   ✅ 使用 D1 数据库`);
        } else {
          console.log(`   ⚠️  使用 mock 数据 (ID 1-${data.length})`);
          console.log(`   💡 需要检查 D1 数据库绑定配置`);
        }
      }
    } else {
      console.log(`   ❌ API 异常`);
    }
  } catch (e) {
    console.log(`   ❌ API 访问失败:`, e);
  }
  
  // 3. 检查特定照片页面
  console.log(`\n3️⃣ 检查照片页面...`);
  try {
    const photoResponse = await fetch(`${BASE_URL}/photo/3250`);
    console.log(`   照片页面状态: ${photoResponse.status} ${photoResponse.statusText}`);
    
    if (photoResponse.ok) {
      console.log(`   ✅ 照片页面正常`);
    } else {
      console.log(`   ⚠️  照片页面异常 (可能是正常的，如果数据不存在)`);
    }
  } catch (e) {
    console.log(`   ❌ 照片页面访问失败:`, e);
  }
  
  console.log(`\n📋 部署验证完成`);
  console.log(`💡 如果发现问题，请检查:`);
  console.log(`   1. Cloudflare Pages 的 D1 数据库绑定`);
  console.log(`   2. 环境变量 NEXT_PUBLIC_R2_BASE 配置`);
  console.log(`   3. 数据库中的数据是否存在`);
}

verifyDeployment().catch(console.error); 