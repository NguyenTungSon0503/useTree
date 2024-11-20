import { useMemo, useState } from "react";

export interface BaseNodeProps {
    level?: number;
    isOpen?: boolean;
    isLoading?: boolean;
    isActive?: boolean;
    isLeaf?: boolean;
    total?: number | string;
    page?: number | string;
}

export interface TreeNode<TData = unknown, TProps extends BaseNodeProps = BaseNodeProps> {
    id: number | string;
    title: string;
    data: TData;
    props: TProps;
    childrens?: TreeNode<TData, TProps>[] | null;
}


export interface ToTreeOptions<TData, TProps> {
    idKey: keyof TData;
    titleKey: keyof TData;
    childsKey: keyof TData;
    setProps?: (d: TData, initialIndex?: number) => TProps;
    initialIndex?: number;
}

export const toTree = <TData, TProps extends BaseNodeProps = BaseNodeProps>(
    data: TData[],
    {
        idKey,
        titleKey,
        childsKey,
        setProps = (_: TData, initialIndex = -1) =>
        ({
            isActive: false,
            isLoading: false,
            isOpen: false,
            isLeaf: false,
            level: initialIndex + 1,
        } as TProps),
        initialIndex = -1,
    }: ToTreeOptions<TData, TProps>
): TreeNode<TData, TProps>[] => {
    return data.map((d) => {
        const childrens =
            d[childsKey] && Array.isArray(d[childsKey])
                ? [
                    ...toTree(d[childsKey] as TData[], {
                        idKey,
                        titleKey,
                        childsKey,
                        setProps: (data, initialLevel) =>
                            setProps(data, (initialLevel as number) + 1),
                        initialIndex: initialIndex + 1,
                    }),
                ]
                : null;
        return {
            data: d,
            id: d[idKey] as number,
            title: d[titleKey] as string,
            props: setProps(d, initialIndex) as TProps,
            childrens,
        };
    });
};

export const useTree = <TData, TProps extends BaseNodeProps = BaseNodeProps>(initialValue: TData[] = [], treeNodeOptions: ToTreeOptions<TData, TProps>) => {
    type UpdateNodePayload = | TreeNode<TData, TProps> | ((oldNode: TreeNode<TData, TProps>) => TreeNode<TData, TProps>);
    type UpdateNodePropsPayload = | Partial<TProps> | ((oldNode: TreeNode<TData, TProps>) => Partial<TProps>);

    // ? The Base State for storing the tree
    const [tree, setTree] = useState<TreeNode<TData, TProps>[]>(toTree(initialValue, treeNodeOptions));

    // * State Actions (Impure)

    const initializeTree = (
        nodes: TreeNode<TData, TProps>[],
        rootId?: number | string
    ) => {
        if (rootId) {
            setNodeChilds(rootId, nodes);
        } else {
            setTree(getNodes(nodes));
        }
    };


    // ? Search for a node recurcively by id and update it
    // ? The update payload (matchedUpdater) can be an obejct or callback function that include the old node

    const updateNode = (
        nodeId: number | string,
        matchedUpdater: UpdateNodePayload,
        notMatchedUpdater?: UpdateNodePayload
    ) => {
        setTree((prevTree) => {
            const internalUpdater = (
                node: TreeNode<TData, TProps>
            ): TreeNode<TData, TProps> => {
                if (node.id === nodeId) {
                    return typeof matchedUpdater === "function"
                        ? {
                            ...matchedUpdater(node),
                            childrens: matchedUpdater(node).childrens?.map(internalUpdater) ??
                                node.childrens?.map(internalUpdater),
                        }
                        : {
                            ...matchedUpdater,
                            childrens: matchedUpdater.childrens?.map(internalUpdater) ?? node.childrens?.map(internalUpdater),
                        };
                }

                return typeof notMatchedUpdater === "function"
                    ? {
                        ...node,
                        ...notMatchedUpdater(node),
                        childrens:
                            notMatchedUpdater(node).childrens?.map(internalUpdater) ??
                            node.childrens?.map(internalUpdater),
                    }
                    : {
                        ...node,
                        ...notMatchedUpdater,
                        childrens:
                            notMatchedUpdater?.childrens?.map(internalUpdater) ??
                            node.childrens?.map(internalUpdater),
                    };
            };

            return prevTree.map(internalUpdater);
        });
    };

    const setNodeChilds = (
        nodeId: number | string,
        childrens: TreeNode<TData, TProps>[]
    ) => {
        updateNode(nodeId, (oldNode) => ({ ...oldNode, childrens: oldNode.childrens ?? childrens }));
    };

    const setNodeProps = (
        id: number | string,
        matchedUpdater: UpdateNodePropsPayload,
        notMatchedUpdater?: UpdateNodePropsPayload
    ) => {
        updateNode(
            id,
            (oldNode) => ({
                ...oldNode,
                props:
                    typeof matchedUpdater === "function"
                        ? { ...oldNode.props, ...matchedUpdater(oldNode) }
                        : { ...oldNode.props, ...matchedUpdater },
            }),
            (oldNode) => ({
                ...oldNode,
                props:
                    typeof notMatchedUpdater === "function"
                        ? { ...oldNode.props, ...notMatchedUpdater(oldNode) }
                        : { ...oldNode.props, ...notMatchedUpdater },
            })
        );
    };

    // ? Works as toggle if (is) not passed

    const setNodeOpen = (nodeId: number | string, is?: boolean) => {
        console.log("set node open  :", nodeId, is);
        setNodeProps(nodeId, ({ props }) => ({
            ...props,
            isOpen: is ?? !props.isOpen,
        }));
    };

    // ? Works as toggle if (is) not passed
    const setActiveNode = (id: number | string, is: boolean) => {
        setNodeProps(
            id,
            ({ props }) => ({ ...props, isOpen: is }),
            ({ props }) => ({ ...props, isOpen: is === true ? false : props.isOpen })
        );
    };


    const getNodes = (nodes?: TreeNode<TData, TProps>[]) => nodes ? [...nodes] : tree;


    const getNodeParent = (
        nodeId: number | string,
        subTree: TreeNode<TData, TProps>[]
    ): TreeNode<TData, TProps> | null => {
        let parent: TreeNode<TData, TProps> | null = null;
        traverseTree((n) => {
            if (n.childrens && n.childrens.some((child) => child.id === nodeId)) {
                parent = n;
            }
        }, subTree);
        return parent;
    };

    const findNodeById = (finder: (node: TreeNode<TData, TProps>) => boolean, nodes: TreeNode<TData, TProps>[] = tree): TreeNode<TData, TProps> | null => {
        for (const node of nodes) {
            if (finder(node)) {
                return node;
            }
            if (node.childrens && node.childrens.length > 0) {
                const foundNode = findNodeById(finder, node.childrens);
                if (foundNode) {
                    return foundNode;
                }
            }
        }
        return null;
    };

    const traverseTree = (callback: (node: TreeNode<TData, TProps>) => void, nodesProp?: TreeNode<TData, TProps>[]) => {
        let nodes = getNodes(nodesProp);
        for (const node of nodes) {
            callback(node);
            if (node.childrens && node.childrens.length > 0) {
                traverseTree(callback, node.childrens);
            }

        }
    };


    const filterTree = (callback: (node: TreeNode<TData, TProps>) => boolean) => {
        const acceptedNodes: TreeNode<TData, TProps>[] = [];
        traverseTree((node) => {
            const isAccepted = callback(node);
            if (isAccepted) {
                acceptedNodes.push(node)
            }
        })
        return acceptedNodes;
    }

    const getNodeParents = (nodeId: number | string): TreeNode<TData, TProps>[] => {
        const parents: TreeNode<TData, TProps>[] = [];
        const parentMap = new Map<number | string, TreeNode<TData, TProps>>();

        const findParents = (currentNode: TreeNode<TData, TProps>) => {
            if (parentMap.has(currentNode.id)) {
                // If the parent has already been found, use the cached value
                parents.unshift(parentMap.get(currentNode.id)!);
                return;
            }

            const parent = getNodeParent(nodeId, [currentNode]);
            if (parent) {
                parents.unshift(parent);
                parentMap.set(parent.id, parent); // Cache the parent for future use
                findParents(parent);
            }
        };

        // Find parents starting from the root node
        traverseTree(findParents, tree);

        return parents;
    };

    // *  Getters
    const openedNodes = useMemo(
        () => tree.filter((node) => node.props.isOpen).map((node) => node.id),
        [tree]
    );
    const loadingNodes = useMemo(
        () => tree.filter((node) => node.props.isLoading).map((node) => node.id),
        [tree]
    );

    return {
        initializeTree,
        setNodeChilds,
        findNodeById,
        traverseTree,
        setNodeProps,
        setActiveNode,
        setNodeOpen,
        toTree,
        getNodeParent,
        getNodeParents,
        filterTree,
        openedNodes,
        loadingNodes,
        tree,
    };
};
