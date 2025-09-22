document.addEventListener('DOMContentLoaded', () => {
    const graphContainer = document.getElementById('graph-visualization');
    const findPathButton = document.getElementById('find-path-button');
    const startNodeInput = document.getElementById('start-node-input');
    const endNodeInput = document.getElementById('end-node-input');
    const pathResultDiv = document.getElementById('path-result');

    let network = null;
    let allNodes = null;
    let allEdges = null;
    let isPathHighlighted = false;
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

    const hoverNodeColor = {
        border: '#27ae60', // Verde escuro para a borda
        background: '#abebc6'  // Verde claro para o preenchimento
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
            hover: true,
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

            // Destaca os nós onde se passa o mouse 
            network.on("hoverNode", function (params) {
                if (isPathHighlighted) {
                    return;
                }
                const hoveredNodeId = params.node;
                const allGraphNodes = allNodes.get({ returnType: "Object" });
                const allGraphEdges = allEdges.get();

                for (const nodeId in allGraphNodes) {
                    allGraphNodes[nodeId].color = { color: 'rgba(200, 200, 200, 0.5)' };
                    allGraphNodes[nodeId].font = { color: 'rgba(200, 200, 200, 0.5)' };
                }

                // Obtém os nós vizinhos
                const connectedNodes = network.getConnectedNodes(hoveredNodeId);

                // Destaca o nó principal sob o mouse com a cor verde
                allGraphNodes[hoveredNodeId].color = hoverNodeColor;
                allGraphNodes[hoveredNodeId].font = { color: '#333' };

                // Mantém os vizinhos com a cor azul padrão
                connectedNodes.forEach(function (nodeId) {
                    allGraphNodes[nodeId].color = defaultNodeColor;
                    allGraphNodes[nodeId].font = { color: '#333' };
                });

                const edgeUpdates = allGraphEdges.map(edge => {
                    if (edge.from == hoveredNodeId || edge.to == hoveredNodeId) {
                        return { id: edge.id, color: '#666', width: 2 }; // Destaque dos vizinhos
                    } else {
                        return { id: edge.id, color: 'rgba(200, 200, 200, 0.3)', width: 1 };
                    }
                });

                const nodeArray = Object.values(allGraphNodes);
                allNodes.update(nodeArray);
                allEdges.update(edgeUpdates);
            });

            network.on("blurNode", function (params) {
                if (isPathHighlighted) {
                    return;
                }
                resetGraphAppearance();
            });

            const nodeUpdates = allNodes.get().map(node => ({
                id: node.id,
                color: defaultNodeColor,
                title: `Roteador: ${node.label}`
            }));
            allNodes.update(nodeUpdates);
            setupNodeSelection();

        } catch (error) {
            graphContainer.innerHTML = `<p style="color: red;">Erro ao carregar a rede: ${error.message}</p>`;
        }
    }

    // Configura a seleção de nós ao clicar
    function setupNodeSelection() {
        let startNodeSelected = false;

        network.on("click", function (params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const nodeLabel = allNodes.get(nodeId).label;

                // Limpa a seleção anterior se ambos os campos estiverem preenchidos
                if (startNodeInput.value && endNodeInput.value) {
                    startNodeInput.value = '';
                    endNodeInput.value = '';
                    startNodeSelected = false;
                    resetGraphAppearance();
                }

                if (!startNodeSelected) {
                    startNodeInput.value = nodeLabel;
                    allNodes.update({
                        id: nodeId, color: {
                            border: '#2ecc71', background: '#a9dfbf'
                        }
                    });
                    startNodeSelected = true;
                } else {
                    endNodeInput.value = nodeLabel;
                    allNodes.update({ id: nodeId, color: { border: '#2ecc71', background: '#a9dfbf' } });
                    startNodeSelected = false;
                }
            }
        });
    }

    // Função que busca o caminho
    async function findAndHighlightPath() {
        isPathHighlighted = false;
        resetGraphAppearance();

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

        // resetGraphAppearance();

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
            isPathHighlighted = true;

            highlightPath(result.path_nodes, result.path_edges);

        } catch (error) {
            pathResultDiv.textContent = `Erro ao buscar o caminho: ${error.message}`;
        }
    }

    function highlightPath(pathNodes, pathEdges) {
        const animationDelay = 300; // Tempo em ms entre cada passo da animação

        // Colore os nós que não estão no caminho de vermelho
        const pathNodesSet = new Set(pathNodes);
        const nodeUpdates = allNodes.get().map(node => {
            if (!pathNodesSet.has(node.id)) {
                return { id: node.id, color: { border: '#e74c3c', background: '#f5b7b1' } };
            }
            return null;
        }).filter(Boolean); // Filtra os nulos
        allNodes.update(nodeUpdates);

        // Escurece as arestas
        const edgeUpdates = allEdges.get().map(edge => ({ id: edge.id, color: '#e0e0e0', width: 1 }));
        allEdges.update(edgeUpdates);

        // Animação do caminho
        let i = 0;
        function highlightNextStep() {
            if (i >= pathNodes.length) return;

            const currentNodeId = pathNodes[i];
            let color;

            if (i === 0) {
                color = { border: '#2ecc71', background: '#a9dfbf' }; // Verde para o nó inicial, final e intermediários
            } else if (i === pathNodes.length - 1) {
                color = { border: '#2ecc71', background: '#a9dfbf' };
            } else {
                color = { border: '#2ecc71', background: '#a9dfbf' };
            }

            // Destaca o nó atual
            allNodes.update([{ id: currentNodeId, color: color }]);

            // Destaca a aresta que leva ao nó atual
            if (i > 0) {
                const currentEdgeId = pathEdges[i - 1];
                allEdges.update([{ id: currentEdgeId, color: '#2c3e50', width: 3 }]);
            }

            i++;
            setTimeout(highlightNextStep, animationDelay);
        }

        highlightNextStep();
    }

    // Restaura a aparência padrão do grafo
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