// ReasonTrace — app.js
(async function () {
    // ─── Load Examples ───
    let examples = [];
    try {
        const data = await d3.json('examples.json');
        examples = data.examples;
    } catch (e) {
        console.warn('Could not load examples:', e);
    }

    // ─── DOM Elements ───
    const traceInput = document.getElementById('trace-input');
    const btnVisualize = document.getElementById('btn-visualize');
    const btnClear = document.getElementById('btn-clear');
    const exampleBtns = document.getElementById('example-buttons');
    const statsBar = document.getElementById('stats-bar');
    const legend = document.getElementById('legend');
    const vizSection = document.getElementById('viz-section');
    const vizContainer = document.getElementById('viz-container');
    const detailPanel = document.getElementById('detail-panel');
    const detailType = document.getElementById('detail-type');
    const detailContent = document.getElementById('detail-content');
    const detailClose = document.getElementById('detail-close');

    // Stats elements
    const statSteps = document.getElementById('stat-steps');
    const statDepth = document.getElementById('stat-depth');
    const statBacktracks = document.getElementById('stat-backtracks');
    const statCorrections = document.getElementById('stat-corrections');
    const statConclusions = document.getElementById('stat-conclusions');

    // Zoom controls
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnReset = document.getElementById('btn-reset');
    const btnExpandAll = document.getElementById('btn-expand-all');
    const btnCollapseAll = document.getElementById('btn-collapse-all');

    // ─── Render Example Buttons ───
    examples.forEach(ex => {
        const btn = document.createElement('button');
        btn.className = 'example-btn';
        btn.innerHTML = `<span class="model-tag">${ex.model}</span> ${ex.title.split('—')[1]?.trim() || ex.title}`;
        btn.addEventListener('click', () => {
            traceInput.value = ex.trace;
            visualize();
        });
        exampleBtns.appendChild(btn);
    });

    // ─── Node Type Detection ───
    const NODE_PATTERNS = {
        backtrack: {
            patterns: [
                /^(wait|but wait|hold on|hmm|actually, wait)/i,
                /let me reconsider/i,
                /i need to reconsider/i,
                /that can't be right/i,
                /this is a contradiction/i,
                /this doesn't work/i,
                /that's wrong/i,
                /impossible/i,
                /let me re-read/i,
                /let me re-examine/i,
            ],
            color: 'var(--node-backtrack)',
            label: 'backtrack'
        },
        correction: {
            patterns: [
                /^actually[,\s]/i,
                /i was wrong/i,
                /i think i was wrong/i,
                /that's the bug/i,
                /oh! (i see|the issue|that's)/i,
                /the (fix|correction|mistake) is/i,
                /i realize/i,
                /^oh wait/i,
                /let me correct/i,
            ],
            color: 'var(--node-correction)',
            label: 'correction'
        },
        conclusion: {
            patterns: [
                /^(therefore|thus|hence|so,? the answer|in conclusion)/i,
                /^the (answer|solution|result|definitive answer) is/i,
                /^my (answer|conclusion|final answer)/i,
                /^final (answer|result|architecture|design)/i,
                /^the design is solid/i,
                /^the most defensible position/i,
            ],
            color: 'var(--node-conclusion)',
            label: 'conclusion'
        },
        verification: {
            patterns: [
                /let me (verify|check|confirm|validate|test|trace)/i,
                /^(verifying|checking|testing|tracing)/i,
                /let me verify/i,
                /let me trace through/i,
                /✓$/,
                /✓\s*$/,
            ],
            color: 'var(--node-verification)',
            label: 'verification'
        },
        exploration: {
            patterns: [
                /^(option|case|approach|alternative|on one hand|from a|scenario)\s*\d*/i,
                /^(let me think|let me consider|let me start|let me estimate|what if|suppose)/i,
                /^(i('ll| will) (try|consider|go with|use|start))/i,
                /^(from a \w+ perspective)/i,
                /for \w+ requirements/i,
                /^(pros|cons):/i,
            ],
            color: 'var(--node-exploration)',
            label: 'exploration'
        }
    };

    function classifyNode(text) {
        const trimmed = text.trim();
        for (const [type, config] of Object.entries(NODE_PATTERNS)) {
            for (const pattern of config.patterns) {
                if (pattern.test(trimmed)) {
                    return { type, color: config.color, label: config.label };
                }
            }
        }
        return { type: 'reasoning', color: 'var(--node-reasoning)', label: 'reasoning' };
    }

    // ─── Parser ───
    function parseTrace(text) {
        const lines = text.split('\n');
        const paragraphs = [];
        let currentParagraph = [];

        // Group lines into paragraphs
        for (const line of lines) {
            if (line.trim() === '') {
                if (currentParagraph.length > 0) {
                    paragraphs.push(currentParagraph.join('\n').trim());
                    currentParagraph = [];
                }
            } else {
                currentParagraph.push(line);
            }
        }
        if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph.join('\n').trim());
        }

        if (paragraphs.length === 0) return null;

        // Build tree structure
        const root = {
            id: 'root',
            text: paragraphs[0],
            summary: summarize(paragraphs[0]),
            ...classifyNode(paragraphs[0]),
            children: [],
            depth: 0
        };

        let currentParent = root;
        let previousNode = root;
        let nodeId = 1;
        let stack = [root]; // Track parent stack for depth management

        for (let i = 1; i < paragraphs.length; i++) {
            const para = paragraphs[i];
            const classification = classifyNode(para);

            const node = {
                id: `node-${nodeId++}`,
                text: para,
                summary: summarize(para),
                ...classification,
                children: [],
                depth: 0
            };

            // Determine parent based on node type and context
            if (classification.type === 'backtrack' || classification.type === 'correction') {
                // Backtracks/corrections go back up the tree
                if (stack.length > 1) {
                    // Go up one level
                    const parent = stack[stack.length - 2] || root;
                    parent.children.push(node);
                    node.depth = parent.depth + 1;
                    stack.push(node);
                } else {
                    root.children.push(node);
                    node.depth = 1;
                    stack = [root, node];
                }
            } else if (classification.type === 'conclusion') {
                // Conclusions attach to root or near-root
                root.children.push(node);
                node.depth = 1;
                stack = [root, node];
            } else if (classification.type === 'exploration') {
                // Explorations branch from current parent
                const parent = stack.length > 1 ? stack[stack.length - 2] || root : root;
                parent.children.push(node);
                node.depth = parent.depth + 1;
                // Replace current branch end
                stack = stack.slice(0, -1);
                stack.push(node);
            } else if (classification.type === 'verification') {
                // Verifications attach to previous node
                previousNode.children.push(node);
                node.depth = previousNode.depth + 1;
                stack.push(node);
            } else {
                // Regular reasoning continues the current branch
                const parent = stack[stack.length - 1];
                parent.children.push(node);
                node.depth = parent.depth + 1;
                stack.push(node);
            }

            previousNode = node;
        }

        return root;
    }

    function summarize(text) {
        // Get first meaningful line, truncated
        const firstLine = text.split('\n')[0].replace(/^[\s#*\-]+/, '').trim();
        if (firstLine.length <= 60) return firstLine;
        return firstLine.substring(0, 57) + '...';
    }

    // ─── Stats Calculation ───
    function calculateStats(root) {
        let steps = 0, maxDepth = 0, backtracks = 0, corrections = 0, conclusions = 0;

        function traverse(node, depth) {
            steps++;
            maxDepth = Math.max(maxDepth, depth);
            if (node.type === 'backtrack') backtracks++;
            if (node.type === 'correction') corrections++;
            if (node.type === 'conclusion') conclusions++;
            for (const child of node.children) {
                traverse(child, depth + 1);
            }
        }

        traverse(root, 0);
        return { steps, maxDepth, backtracks, corrections, conclusions };
    }

    // ─── D3 Visualization ───
    let svg, g, zoom, treeLayout;
    let currentRoot = null;

    const colorMap = {
        reasoning: '#6366f1',
        exploration: '#3b82f6',
        backtrack: '#f59e0b',
        correction: '#ef4444',
        conclusion: '#22c55e',
        verification: '#06b6d4',
    };

    function renderTree(root) {
        currentRoot = root;
        const svgEl = document.getElementById('tree-svg');
        const width = vizContainer.clientWidth;
        const height = 600;

        // Clear previous
        d3.select(svgEl).selectAll('*').remove();

        svg = d3.select(svgEl)
            .attr('width', width)
            .attr('height', height);

        g = svg.append('g');

        // Zoom behavior
        zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Create hierarchy
        const hierarchy = d3.hierarchy(root);

        // Count all nodes to determine layout
        const totalNodes = hierarchy.descendants().length;
        const treeWidth = Math.max(width - 100, totalNodes * 40);
        const treeHeight = Math.max(height - 80, hierarchy.height * 140);

        // Tree layout — top to bottom
        treeLayout = d3.tree()
            .size([treeWidth, treeHeight])
            .separation((a, b) => {
                return a.parent === b.parent ? 1.2 : 2;
            });

        treeLayout(hierarchy);

        // Center the tree
        const initialTransform = d3.zoomIdentity
            .translate(width / 2 - treeWidth / 2, 40)
            .scale(Math.min(1, width / (treeWidth + 100)));

        svg.call(zoom.transform, initialTransform);

        // Draw links
        const links = g.selectAll('.link-path')
            .data(hierarchy.links())
            .enter()
            .append('path')
            .attr('class', d => `link-path ${d.target.data.type === 'backtrack' ? 'backtrack' : ''}`)
            .attr('d', d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y)
            );

        // Draw nodes
        const nodes = g.selectAll('.node-group')
            .data(hierarchy.descendants())
            .enter()
            .append('g')
            .attr('class', 'node-group')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .on('click', (event, d) => {
                event.stopPropagation();
                showDetail(d.data);
            });

        // Node circles
        nodes.append('circle')
            .attr('class', 'node-circle')
            .attr('r', d => d.depth === 0 ? 14 : (d.children ? 10 : 8))
            .attr('fill', d => colorMap[d.data.type] || '#6e6e8e')
            .attr('stroke', d => colorMap[d.data.type] || '#6e6e8e')
            .attr('fill-opacity', 0.2)
            .attr('stroke-opacity', 0.8);

        // Type icon in node
        nodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('font-size', d => d.depth === 0 ? '12px' : '9px')
            .attr('fill', d => colorMap[d.data.type] || '#6e6e8e')
            .text(d => {
                const icons = {
                    reasoning: '◆',
                    exploration: '◇',
                    backtrack: '↩',
                    correction: '✕',
                    conclusion: '✓',
                    verification: '✔'
                };
                return icons[d.data.type] || '·';
            });

        // Node labels
        nodes.append('text')
            .attr('class', 'node-label')
            .attr('dy', d => d.depth === 0 ? -22 : -16)
            .attr('text-anchor', 'middle')
            .text(d => {
                const maxLen = 35;
                const s = d.data.summary;
                return s.length > maxLen ? s.substring(0, maxLen - 2) + '…' : s;
            })
            .style('font-size', '10px')
            .style('fill', '#c0c0d4');

        // Type badge below node
        nodes.append('text')
            .attr('class', 'node-type-badge')
            .attr('dy', d => d.depth === 0 ? 24 : 20)
            .attr('text-anchor', 'middle')
            .text(d => d.data.label)
            .style('fill', d => colorMap[d.data.type] || '#6e6e8e')
            .style('opacity', 0.6);

        // Children count indicator
        nodes.filter(d => d.data.children && d.data.children.length > 0)
            .append('text')
            .attr('class', 'collapse-indicator')
            .attr('dx', d => d.depth === 0 ? 18 : 14)
            .attr('dy', '0.35em')
            .text(d => d.data.children.length > 0 ? `(${d.data.children.length})` : '')
            .style('fill', '#4a4a6a')
            .style('font-size', '8px');
    }

    // ─── Detail Panel ───
    function showDetail(node) {
        detailType.textContent = node.label;
        detailType.className = `detail-type ${node.type}`;
        detailContent.textContent = node.text;
        detailPanel.classList.remove('hidden');
    }

    detailClose.addEventListener('click', () => {
        detailPanel.classList.add('hidden');
    });

    // Close panel on click outside
    document.addEventListener('click', (e) => {
        if (!detailPanel.contains(e.target) && !e.target.closest('.node-group')) {
            detailPanel.classList.add('hidden');
        }
    });

    // ─── Controls ───
    btnZoomIn.addEventListener('click', () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.3);
    });

    btnZoomOut.addEventListener('click', () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.7);
    });

    btnReset.addEventListener('click', () => {
        if (currentRoot) renderTree(currentRoot);
    });

    btnExpandAll.addEventListener('click', () => {
        if (currentRoot) renderTree(currentRoot);
    });

    btnCollapseAll.addEventListener('click', () => {
        if (currentRoot) renderTree(currentRoot);
    });

    // ─── Main Visualize Function ───
    function visualize() {
        const text = traceInput.value.trim();
        if (!text) return;

        const root = parseTrace(text);
        if (!root) return;

        // Update stats
        const stats = calculateStats(root);
        statSteps.textContent = stats.steps;
        statDepth.textContent = stats.maxDepth;
        statBacktracks.textContent = stats.backtracks;
        statCorrections.textContent = stats.corrections;
        statConclusions.textContent = stats.conclusions;

        // Show sections
        statsBar.classList.remove('hidden');
        legend.classList.remove('hidden');
        vizSection.classList.remove('hidden');

        // Render tree
        renderTree(root);

        // Scroll to visualization
        vizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    btnVisualize.addEventListener('click', visualize);

    btnClear.addEventListener('click', () => {
        traceInput.value = '';
        statsBar.classList.add('hidden');
        legend.classList.add('hidden');
        vizSection.classList.add('hidden');
        detailPanel.classList.add('hidden');
    });

    // Ctrl+Enter shortcut
    traceInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            visualize();
        }
    });

    // ─── Handle window resize ───
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (currentRoot) renderTree(currentRoot);
        }, 250);
    });
})();