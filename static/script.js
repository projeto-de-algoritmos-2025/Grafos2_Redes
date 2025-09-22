document.addEventListener('DOMContentLoaded', () => {
    const graphContainer = document.getElementById('graph-visualization');
    const findPathButton = document.getElementById('find-path-button');
    const startNodeInput = document.getElementById('start-node-input');
    const endNodeInput = document.getElementById('end-node-input');
    const pathResultDiv = document.getElementById('path-result');

    let network = null;
    let allNodes = null;
    let allEdges = null;
    // Mapeia label para id
    let nodeMap = {};

    const defaultNodeColor = {
        border: '#4a90e2',
        background: '#d4e4fc',
        highlight: {
            border: '#4a90e2',
            background: '#e8f0fe'
        }
    };

    const options = {
        layout: {
            improvedLayout: true,
        },
        edges: {
            color: {
                color: '#bdc3c7',
                highlight: '#8e969c',
            },
            font: {
                align: 'top',
            },
            arrows: {
                to: { enabled: false }
            }
        },
        nodes: {
            shape: 'dot',
            size: 20,
            font: {
                size: 14,
                color: '#333'
            },
            borderWidth: 2,
        },
        physics: {
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -50,
                centralGravity: 0.01,
                springLength: 100,
                springConstant: 0.08,
                avoidOverlap: 0.8
            }
        },
        interaction: {
            dragNodes: true,
            zoomView: true,
        }
    };

    // Inicializa a rede
    async function initializeNetwork() {
        try {
            const response = await fetch('http://127.0.0.1:5001/api/graph');
            const data = await response.json();

            const edgesWithIds = data.edges.map(edge => ({ ...edge, id: edge.id || `${edge.from}-${edge.to}` }));

            allNodes = new vis.DataSet(data.nodes);
            allEdges = new vis.DataSet(edgesWithIds);

            data.nodes.forEach(node => {
                // Armazena o nome em minúsculas para facilitar a busca
                nodeMap[node.label.toLowerCase()] = node.id;
            });

            const graphData = { nodes: allNodes, edges: allEdges };
            network = new vis.Network(graphContainer, graphData, options);

            const nodeUpdates = allNodes.get().map(node => ({
                id: node.id,
                color: defaultNodeColor
            }));
            allNodes.update(nodeUpdates);

        } catch (error) {
            graphContainer.innerHTML = `<p style="color: red;">Erro ao carregar a rede: ${error.message}</p>`;
        }
    }

    // Função que busca o caminho
    async function findAndHighlightPath() {
        const startLabel = startNodeInput.value.trim().toLowerCase();
        const endLabel = endNodeInput.value.trim().toLowerCase();

        if (!startLabel || !endLabel) {
            pathResultDiv.textContent = 'Por favor, insira os roteadores de origem e destino.';
            return;
        }

        const startNodeId = nodeMap[startLabel];
        const endNodeId = nodeMap[endLabel];

        if (!startNodeId || !endNodeId) {
            pathResultDiv.textContent = 'Roteador de origem ou destino não encontrado. Verifique os nomes.';
            return;
        }

        resetGraphAppearance();

        try {
            const response = await fetch(`http://127.0.0.1:5001/api/shortest-path/${startNodeId}/${endNodeId}`);
            const result = await response.json();

            if (result.error || result.path_nodes.length === 0) {
                pathResultDiv.textContent = result.error || 'Nenhum caminho encontrado.';
                const nodeUpdates = allNodes.get().map(n => ({
                    id: n.id,
                    color: { border: '#e74c3c', background: '#f5b7b1' }
                }));
                allNodes.update(nodeUpdates);
                return;
            }

            pathResultDiv.innerHTML = `<strong>Caminho Encontrado:</strong> ${result.path_labels.join(' → ')} <br> <strong>Latência Total:</strong> ${result.distance} ms`;

            // Passa os nós e as arestas para a função
            highlightPath(result.path_nodes, result.path_edges);

        } catch (error) {
            pathResultDiv.textContent = `Erro ao buscar o caminho: ${error.message}`;
        }
    }

    function highlightPath(pathNodes, pathEdges) {
        const pathNodesSet = new Set(pathNodes);
        const pathEdgesSet = new Set(pathEdges);

        // Atualiza as cores dos nós
        const nodeUpdates = allNodes.get().map(node => {
            let color;
            if (node.id === pathNodes[0] || node.id === pathNodes[pathNodes.length - 1]) {
                color = { border: '#2ecc71', background: '#a9dfbf' }; // Verde: começo/fim do caminho
            } else if (pathNodesSet.has(node.id)) {
                color = { border: '#3498db', background: '#aed6f1' }; // Azul: caminho utilizado
            } else {
                color = { border: '#e74c3c', background: '#f5b7b1' }; // Vermelho: caminho não utilizados
            }
            return { id: node.id, color: color };
        });
        allNodes.update(nodeUpdates);

        // Atualiza as cores das arestas
        const edgeUpdates = allEdges.get().map(edge => {
            const isPathEdge = pathEdgesSet.has(edge.id);
            return {
                id: edge.id,
                color: isPathEdge ? '#2c3e50' : '#e0e0e0',
                width: isPathEdge ? 3 : 1
            };
        });
        allEdges.update(edgeUpdates);
    }

    function resetGraphAppearance() {
        const nodeUpdates = allNodes.get().map(node => ({
            id: node.id,
            color: defaultNodeColor
        }));
        allNodes.update(nodeUpdates);

        const edgeUpdates = allEdges.get().map(edge => ({
            id: edge.id,
            color: '#bdc3c7',
            width: 1
        }));
        allEdges.update(edgeUpdates);
        pathResultDiv.textContent = '';
    }


    findPathButton.addEventListener('click', findAndHighlightPath);

    startNodeInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            findAndHighlightPath();
        }
    });

    endNodeInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            findAndHighlightPath();
        }
    });

    initializeNetwork();
});