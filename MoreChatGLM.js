// ==UserScript==
// @name         MoreChatGLM
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  MoreChatGLM 是一款专为 智谱清言（ChatGLM ）平台设计的用户脚本，旨在优化用户界面，增强功能体验。脚本支持以下功能：对话滚动条、聊天气泡样、宽屏对话、清空内容快捷按钮、内容脱敏快捷按钮、内容脱敏功能配置，以及简洁的浮动菜单便捷操作。此脚本提升了 ChatGLM 的美观性与易用性，让聊天更愉快、更高效。
// @author       DD1024z
// @match        https://chatglm.cn/*
// @icon         https://chatglm.cn/img/icons/favicon.ico
// @license      Apache License 2.0
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @downloadURL  https://update.greasyfork.org/scripts/523195/MoreChatGLM.user.js
// @updateURL    https://update.greasyfork.org/scripts/523195/MoreChatGLM.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const APP_NAME = 'MoreChatGLM';

    const defaultConfig = {
        displayContentScroll: true,
        displayWideScreen: true,
        displayChatBubble: true,
        displayTopicPopoverMenu: true,
        displayClearButton: true,
        displaySanitizeButton: true,
        sanitizationRules: [
            "[1-9]\\d{5}[1-9]\\d{3}((0\\d)|(1[0-2]))(([0|1|2]\\d)|3[0-1])(\\d{4}|\\d{3}[Xx])->${身份证号码}",
            "(0|86|17951)?(13[0-9]|15[0-35-9]|166|17[3-8]|18[0-9]|14[5-79]|19[0-9])[-]?[0-9]{4}[-]?[0-9]{4}->${手机号码}",
            "(0\\d{2,3}-?\\d{7,8})->${座机号码}",
            "https?:\\/\\/([a-zA-Z0-9_-]+\\.?)+(:\\d+)?(\\/.*)?->${链接}",
            "\\w+([-+.\\w])*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*->${电子邮箱}",
            "这是匹配的长内容->短内容"
        ]
    };

    const config = (() => {
        const savedConfig = JSON.parse(localStorage.getItem(APP_NAME));
        return { ...defaultConfig, ...savedConfig };
    })();

    function saveConfig(updatedConfig) {
        localStorage.setItem(APP_NAME, JSON.stringify(updatedConfig));
    }

    function observeDOMChanges(callback, target = document.body, config = { childList: true, subtree: true }) {
        const observer = new MutationObserver(callback);
        const observerConfig = config;
        observer.observe(target, observerConfig);
        return observer;
    }

    const menuItems = [
        { text: '对话滚动条', action: applyContentScroll, checked: config.displayContentScroll },
        { text: '聊天气泡', action: applyChatBubble, checked: config.displayChatBubble },
        { text: '宽屏对话', action: applyWideScreen, checked: config.displayWideScreen },
        { text: '最近对话防误删', action: applyTopicPopoverMenu, checked: config.displayTopicPopoverMenu },
        { text: '清空内容快捷按钮', action: applyClearButton, checked: config.displayClearButton },
        { text: '内容脱敏快捷按钮', action: applySanitizeButton, checked: config.displaySanitizeButton },
        { text: '内容脱敏规则配置', action: showModalDataSanitization },
        { text: '检查更新', action: checkForUpdates },
        { text: '赞赏鼓励', action: showModalAppreciate },
        { text: '关于', action: () => window.open('https://github.com/10D24D/MoreChatGLM', '_blank') },
    ];

    function addFloatingMenu() {
        const asideHeader = document.querySelector('div.aside-header');
        if (!asideHeader) return;

        const triggerDiv = document.createElement('div');
        triggerDiv.id = APP_NAME + '-menu-trigger';
        triggerDiv.textContent = APP_NAME;
        triggerDiv.style.background = '#007BFF';
        triggerDiv.style.color = '#FFFFFF';
        triggerDiv.style.padding = '10px';
        triggerDiv.style.marginTop = '10px';
        triggerDiv.style.borderRadius = '5px';
        triggerDiv.style.cursor = 'pointer';
        triggerDiv.style.textAlign = 'center';
        triggerDiv.style.transition = 'background 0.3s';
        triggerDiv.style.width = '90%';
        triggerDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        triggerDiv.style.fontSize = '14px';
        triggerDiv.style.position = 'relative';

        const menuPanel = document.createElement('div');
        menuPanel.id = APP_NAME + '-menu-panel';
        menuPanel.style.position = 'absolute';
        menuPanel.style.top = '88px';
        menuPanel.style.left = '13px';
        menuPanel.style.background = '#FFFFFF';
        menuPanel.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
        menuPanel.style.borderRadius = '5px';
        menuPanel.style.padding = '10px';
        menuPanel.style.zIndex = '1000';
        menuPanel.style.width = '192px';
        menuPanel.classList = 'hidden';

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.style.display = 'flex';
            menuItem.style.alignItems = 'center';
            menuItem.style.justifyContent = 'space-between';
            menuItem.style.padding = '5px 10px';
            menuItem.style.cursor = 'pointer';
            menuItem.style.borderBottom = '1px solid #DDDDDD';
            menuItem.style.height = '25px';
            menuItem.style.transition = 'background-color 0.3s';

            menuItem.onmouseover = () => {
                menuItem.style.backgroundColor = '#F1F2F3';
            };
            menuItem.onmouseout = () => {
                menuItem.style.backgroundColor = '#FFFFFF';
            };

            const itemText = document.createElement('span');
            itemText.textContent = item.text;

            menuItem.appendChild(itemText);

            if (item.hasOwnProperty('checked')) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.checked;
                checkbox.style.width = '20px';
                checkbox.style.height = '20px';
                checkbox.style.cursor = 'pointer';
                checkbox.onchange = () => {
                    item.checked = checkbox.checked;
                    item.action(item.checked);
                };
                menuItem.appendChild(checkbox);
            } else {
                menuItem.onclick = () => {
                    item.action();
                };
            }

            menuPanel.appendChild(menuItem);
        });

        triggerDiv.addEventListener('mouseenter', () => {
            menuPanel.classList.remove('hidden');
        });
        triggerDiv.addEventListener('mouseleave', (e) => {
            if (!menuPanel.contains(e.relatedTarget)) {
                menuPanel.classList.add('hidden');
            }
        });
        menuPanel.addEventListener('mouseleave', (e) => {
            if (!triggerDiv.contains(e.relatedTarget)) {
                menuPanel.classList.add('hidden');
            }
        });

        asideHeader.parentElement.insertBefore(triggerDiv, asideHeader.nextSibling);
        asideHeader.parentElement.insertBefore(menuPanel, asideHeader.nextSibling);

        const aside = asideHeader.closest('aside');
        observeDOMChanges(() => {
            if (aside.classList.contains('collapse-aside')) {
                triggerDiv.classList.add('hidden');
            } else {
                triggerDiv.classList.remove('hidden');
            }
        }, aside, { attributes: true, attributeFilter: ['class'] })
    }

    function updateDisplayConfig(key, isChecked = false) {
        config[key] = isChecked;
        saveConfig(config);
    }

    function applyContentScroll(isChecked = false) {
        updateDisplayConfig('displayContentScroll', isChecked)
        const container = document.querySelector('.conversation-list');
        if (container) {
            if (isChecked) {
                container.classList.remove('scroll-display-none');
            } else {
                container.classList.add('scroll-display-none');
            }
            console.log('ContentScroll:', isChecked);
        }
    };

    function applyWideScreen(isChecked = false) {
        updateDisplayConfig('displayWideScreen', isChecked);

        let wideScreenStyle = document.getElementById(APP_NAME + '-wide-screen-style');

        if (!wideScreenStyle) {
            wideScreenStyle = document.createElement('style');
            wideScreenStyle.id = APP_NAME + '-wide-screen-style';
            document.head.appendChild(wideScreenStyle);
        }

        if (isChecked) {
            let dynamicStyles = `
                .markdown-body, .conversation-item, .interact-operate, .component-box-new {
                    max-width: 100% !important;
                    margin: 0 auto !important;
                }
            `;

            const uniqueItemAttributes = new Set();
            document.querySelectorAll('.dialogue .detail .item').forEach(item => {
                const dynamicAttribute = Array.from(item.attributes).find(attr => attr.name.startsWith('data-v-'));
                if (dynamicAttribute) {
                    uniqueItemAttributes.add(dynamicAttribute.name);
                }
            });

            if (uniqueItemAttributes.size > 0) {
                uniqueItemAttributes.forEach(attr => {
                    dynamicStyles += `
                        .dialogue .detail .item[${attr}] {
                            max-width: 100% !important;
                        }
                    `;
                });
            } else {
                dynamicStyles += `
                    .dialogue .detail .item {
                        max-width: 100% !important;
                    }
                `;
            }

            const uniqueBottomAttributes = new Set();
            document.querySelectorAll('.conversation-bottom').forEach(bottom => {
                const dynamicAttribute = Array.from(bottom.attributes).find(attr => attr.name.startsWith('data-v-'));
                if (dynamicAttribute) {
                    uniqueBottomAttributes.add(dynamicAttribute.name);
                }
            });

            if (uniqueBottomAttributes.size > 0) {
                uniqueBottomAttributes.forEach(attr => {
                    dynamicStyles += `
                        .conversation-bottom[${attr}], .dialogue .conversation-bottom[${attr}] {
                            max-width: 100% !important;
                        }
                    `;
                });
            } else {
                dynamicStyles += `
                    .conversation-bottom, .dialogue .conversation-bottom {
                        max-width: 100% !important;
                    }
                `;
            }

            wideScreenStyle.textContent = dynamicStyles.replace(/\s+/g, ' ').trim();
        } else {
            wideScreenStyle.textContent = '';
        }

        console.log('WideScreen:', isChecked);
    }

    function applyTopicPopoverMenu(isChecked = false) {
        updateDisplayConfig('displayTopicPopoverMenu', isChecked);

        let menuStyleElement = document.getElementById(APP_NAME + '-topic-menu-style');

        if (!menuStyleElement) {
            menuStyleElement = document.createElement('style');
            menuStyleElement.id = APP_NAME + '-topic-menu-style';
            document.head.appendChild(menuStyleElement);
        }

        if (isChecked) {
            const topicPopoverMenus = document.querySelectorAll('.history-item');

            const uniqueAttributes = new Set();

            topicPopoverMenus.forEach(item => {
                const dynamicAttribute = Array.from(item.attributes).find(attr => attr.name.startsWith('data-v-'));
                if (dynamicAttribute) {
                    uniqueAttributes.add(dynamicAttribute.name);
                }
            });

            let dynamicStyles = '';
            if (uniqueAttributes.size > 0) {
                uniqueAttributes.forEach(attr => {
                    dynamicStyles += `
                        .history-item[${attr}] .el-popper {
                            display: none !important;
                        }
                    `;
                });
            } else {
                dynamicStyles = `
                    .history-item .el-popper {
                        display: none !important;
                    }
                `;
            }

            menuStyleElement.textContent = dynamicStyles.replace(/\s+/g, ' ').trim();
        } else {
            menuStyleElement.textContent = '';
        }

        console.log('TopicPopoverMenu:', isChecked);
    }

    function applyChatBubble(isChecked = false) {
        updateDisplayConfig('displayChatBubble', isChecked);

        let bubbleStyleElement = document.getElementById(APP_NAME + '-chat-bubble-style');

        if (!bubbleStyleElement) {
            bubbleStyleElement = document.createElement('style');
            bubbleStyleElement.id = APP_NAME + '-chat-bubble-style';
            document.head.appendChild(bubbleStyleElement);
        }

        if (isChecked) {
            const bubbleStyles = `
                div.question-text-style {
                    background-color: #DEEDD7;
                    border-radius: 0.5rem;
                    padding: 0.75rem 0.5rem;
                    margin-left: 12px;
                    max-width: 100%;
                }
                div.markdown-body {
                    background-color: #F1F2F3;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1.25rem;
                    max-width: 100%;
                }
            `;

            bubbleStyleElement.textContent = bubbleStyles.replace(/\s+/g, ' ').trim();
            hideEmptyMarkdownBodies();
        } else {
            bubbleStyleElement.textContent = '';
        }

        console.log('ChatBubble:', isChecked);
    }

    function hideEmptyMarkdownBodies() {
        const markdownBodies = document.querySelectorAll('div.markdown-body');

        markdownBodies.forEach(body => {
            if (!body.textContent.trim()) {
                body.style.display = 'none';
            } else {
                body.style.display = '';
            }
        });
    }

    const verInt = function (vs) {
        const vl = vs.split('.');
        let vi = 0;
        for (let i = 0; i < vl.length && i < 3; i++) {
            vi += parseInt(vl[i]) * (1000 ** (2 - i));
        }
        return vi;
    };

    function checkForUpdates(action = "click") {
        const downloadURL = `https://raw.githubusercontent.com/10D24D/MoreChatGLM/main/MoreChatGLM.js`;
        const updateURL = downloadURL;
        GM_xmlhttpRequest({
            method: "GET",
            url: `${updateURL}?t=${Date.now()}`,
            onload: function (response) {
                const crv = GM_info.script.version;
                const m = response.responseText.match(/@version\s+(\S+)/);
                const ltv = m && m[1];
                if (ltv && verInt(ltv) > verInt(crv)) {
                    alert('发现新版本')
                    window.open(`${downloadURL}?t=${Date.now()}`, '_blank');
                } else {
                    if (action === "click") {
                        alert('已是最新版')
                    }
                }
            }
        });
    };

    function showModalAppreciate() {
        const existingModal = document.getElementById(APP_NAME + '-appreciate-modal');
        if (existingModal) {
            existingModal.style.display = 'block';
            return;
        }

        const modal = document.createElement('div');
        modal.id = APP_NAME + '-appreciate-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.width = '80%';
        modal.style.maxWidth = '500px';
        modal.style.backgroundColor = '#FFFFFF';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        modal.style.overflow = 'hidden';
        modal.style.zIndex = '1000';

        modal.innerHTML = `
            <div style="padding: 16px; border-bottom: 1px solid #DDDDDD; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; font-size: 18px; color: #333333;">赞赏鼓励</h2>
            </div>
            <div style="padding: 16px;">
                <p style="margin: 0 0 16px; color: #555555; font-size: 14px;">本项目由兴趣驱使，优化用户界面，增强功能体验，并共享世界。<br>如果你喜欢作者的项目，可以给作者一个免费的Star或者Follow。</p>
                <img src="https://raw.githubusercontent.com/10D24D/MoreChatGLM/main/static/appreciate_wechat.jpg" style="display: block; max-width: 100%; height: auto; margin: 0 auto 16px;">
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button style="padding: 8px 16px; background-color: #007BFF; color: #FFFFFF; border: none; border-radius: 4px; cursor: pointer;" onclick="window.open('https://github.com/10D24D/MoreChatGLM?tab=readme-ov-file#%E8%B5%9E%E8%B5%8F%E9%BC%93%E5%8A%B1')">更多鼓励方式</button>
                    <button style="padding: 8px 16px; background-color: #F0F0F0; color: #333333; border: none; border-radius: 4px; cursor: pointer;" onclick="document.getElementById('${modal.id}').style.display = 'none';">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function validateRules(rules) {
        return rules.every(rule => {
            const [regex, replacement] = rule.split('->').map(item => item.trim());
            try {
                new RegExp(regex);
                return !!replacement;
            } catch {
                return false;
            }
        });
    }

    function applyDataSanitizationRules() {
        const inputBox = document.querySelector('#search-input-box div.input-box-inner textarea');
        if (!inputBox) {
            alert('未找到输入框');
            return;
        }

        let content = inputBox.value;
        config.sanitizationRules.forEach(rule => {
            const [regex, replacement] = rule.split('->').map(item => item.trim());
            if (regex && replacement) {
                try {
                    const regexObj = new RegExp(regex, 'g');
                    content = content.replace(regexObj, replacement);
                } catch (error) {
                    console.error('Invalid regex:', regex, error);
                }
            }
        });

        inputBox.value = content;
        inputBox.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function showModalDataSanitization() {
        const modalId = APP_NAME + '-data-sanitization-modal';
        let modal = document.getElementById(modalId);
        if (modal) {
            modal.querySelector('#' + APP_NAME + '-data-sanitization-rules').value = config.sanitizationRules.join('\n');
            modal.style.display = 'block';
            return;
        }

        modal = document.createElement('div');
        modal.id = modalId;
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.width = '80%';
        modal.style.maxWidth = '500px';
        modal.style.backgroundColor = '#FFFFFF';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        modal.style.overflow = 'hidden';
        modal.style.zIndex = '1000';

        modal.innerHTML = `
            <div style="padding: 16px; border-bottom: 1px solid #DDDDDD; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; font-size: 18px; color: #333333;">内容脱敏规则配置</h2>
            </div>
            <div style="padding: 16px;">
                <p style="margin: 0 0 16px; color: #555555; font-size: 14px; text-align: left; line-height: 20px;">本功能会将聊天输入框里的敏感内容进行脱敏<br>请根据正则表达式语法编写内容脱敏规则，不同的规则用换行间隔。<br>格式：匹配内容（正则表达式）->替换内容</p>
                <textarea id="${APP_NAME + '-data-sanitization-rules'}" style="width: 95%; height: 10rem; resize: none; border-radius: 4px; padding: 10px; background-color: #F9F9F9; border: 1px solid #DDDDDD;">${config.sanitizationRules.join('\n')}</textarea>
                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="${APP_NAME + '-reset-rules-button'}" style="padding: 10px 20px; background-color: #28A745; color: white; border: none; border-radius: 4px; cursor: pointer;">恢复默认规则</button>
                    <button id="${APP_NAME + '-save-rules-button'}" style="padding: 10px 20px; background-color: #007BFF; color: white; border: none; border-radius: 4px; cursor: pointer;">保存</button>
                    <button style="padding: 10px 20px; background-color: #F0F0F0; color: #333333; border: none; border-radius: 4px; cursor: pointer;" onclick="document.getElementById('${modalId}').style.display = 'none';">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById(APP_NAME + '-save-rules-button').addEventListener('click', () => {
            const rulesText = document.getElementById(APP_NAME + '-data-sanitization-rules').value;
            const updatedRules = rulesText.split('\n').filter(rule => rule.trim() !== '');
            if (validateRules(updatedRules)) {
                config.sanitizationRules = updatedRules;
                saveConfig(config);
                alert('规则已保存！');
                modal.style.display = 'none';
            } else {
                alert('规则格式不正确，请检查并重试！');
            }
        });

        document.getElementById(APP_NAME + '-reset-rules-button').addEventListener('click', () => {
            config.sanitizationRules = [...defaultConfig.sanitizationRules];
            saveConfig(config);
            document.getElementById(APP_NAME + '-data-sanitization-rules').value = config.sanitizationRules.join('\n');
            alert('已恢复默认规则！');
        });
    }

    function clearInputBoxContent() {
        const inputBox = document.querySelector('#search-input-box div.input-box-inner textarea');
        if (!inputBox) {
            alert('未找到输入框');
            return;
        }

        inputBox.value = '';
        inputBox.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function applyClearButton(isChecked = false) {
        updateDisplayConfig('displayClearButton', isChecked);

        const inputWrap = document.querySelector('#search-input-box div.input-wrap');
        if (!inputWrap) return;

        let clearButton = document.querySelector('#' + APP_NAME + '-clear-button');
        let sanitizeButton = document.querySelector('#' + APP_NAME + '-sanitize-button');
        const enterIcon = inputWrap.querySelector('.enter img.enter_icon');

        if (isChecked) {
            if (!clearButton) {
                clearButton = document.createElement('button');
                clearButton.id = APP_NAME + '-clear-button';
                clearButton.textContent = '清空内容';
                clearButton.style.backgroundColor = '#FB5531';
                clearButton.style.color = '#FFFFFF';
                clearButton.style.border = 'none';
                clearButton.style.borderRadius = '4px';
                clearButton.style.cursor = 'pointer';
                clearButton.style.height = '30px';
                clearButton.style.width = '70px';
                clearButton.onclick = clearInputBoxContent;

                const clearButtonWrapper = document.createElement('div');
                clearButtonWrapper.className = 'enter';
                clearButtonWrapper.style.marginRight = '10px';
                clearButtonWrapper.style.alignSelf = 'flex-end';
                clearButtonWrapper.appendChild(clearButton);

                if (sanitizeButton) {
                    sanitizeButton.parentNode.before(clearButtonWrapper);
                } else if (enterIcon) {
                    enterIcon.parentNode.before(clearButtonWrapper);
                } else {
                    inputWrap.appendChild(clearButtonWrapper);
                }
            }
        } else {
            if (clearButton) {
                clearButton.parentElement.remove();
            }
        }
        console.log('ClearButton:', isChecked);
    }

    function applySanitizeButton(isChecked = false) {
        updateDisplayConfig('displaySanitizeButton', isChecked);

        const inputWrap = document.querySelector('#search-input-box div.input-wrap');
        if (!inputWrap) return;

        let sanitizeButton = document.querySelector('#' + APP_NAME + '-sanitize-button');
        const enterIcon = inputWrap.querySelector('.enter img.enter_icon');

        if (isChecked) {
            if (!sanitizeButton) {
                sanitizeButton = document.createElement('button');
                sanitizeButton.id = APP_NAME + '-sanitize-button';
                sanitizeButton.textContent = '内容脱敏';
                sanitizeButton.style.backgroundColor = '#288C8C';
                sanitizeButton.style.color = '#FFFFFF';
                sanitizeButton.style.border = 'none';
                sanitizeButton.style.borderRadius = '4px';
                sanitizeButton.style.cursor = 'pointer';
                sanitizeButton.style.height = '30px';
                sanitizeButton.style.width = '70px';
                sanitizeButton.onclick = applyDataSanitizationRules;

                const sanitizeButtonWrapper = document.createElement('div');
                sanitizeButtonWrapper.className = 'enter';
                sanitizeButtonWrapper.style.marginRight = '10px';
                sanitizeButtonWrapper.style.alignSelf = 'flex-end';
                sanitizeButtonWrapper.appendChild(sanitizeButton);

                if (enterIcon) {
                    enterIcon.parentNode.before(sanitizeButtonWrapper);
                } else {
                    inputWrap.appendChild(sanitizeButtonWrapper);
                }
            }
        } else {
            if (sanitizeButton) {
                sanitizeButton.parentElement.remove();
            }
        }
        console.log('SanitizeButton:', isChecked);
    }

    function init() {
        addFloatingMenu();

        applyContentScroll(config.displayContentScroll);
        applyWideScreen(config.displayWideScreen);
        applyChatBubble(config.displayChatBubble);
        applyTopicPopoverMenu(config.displayTopicPopoverMenu);
        applyClearButton(config.displayClearButton);
        applySanitizeButton(config.displaySanitizeButton);

        observeDOMChanges(() => {
            requestAnimationFrame(() => {
                if (config.displayContentScroll) applyContentScroll(true);
                if (config.displayWideScreen) applyWideScreen(true);
                if (config.displayChatBubble) applyChatBubble(true);
                if (config.displayClearButton) applyClearButton(true);
                if (config.displaySanitizeButton) applySanitizeButton(true);
            });
        });
    }

    window.addEventListener('load', init);

    GM_addStyle(`
        .hidden {
            display: none !important;
        }
    `);
})();
