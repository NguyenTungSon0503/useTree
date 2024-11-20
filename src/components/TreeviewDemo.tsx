import React from "react";
import {
  useTree,
  BaseNodeProps,
  ToTreeOptions,
  TreeNode,
} from "../hooks/useTree"; // Adjust the import path as needed

const data = [
  {
    id: 1,
    name: "Root 1",
    employees: [
      { id: 2, name: "Child 1", employees: [] },
      { id: 3, name: "Child 2", employees: [] },
    ],
  },
  {
    id: 4,
    name: "Root 2",
    employees: [
      {
        id: 5,
        name: "Child 3",
        employees: [{ id: 6, name: "Subchild 1", employees: [] }],
      },
    ],
  },
];

const TreeView = <TData, TProps extends BaseNodeProps = BaseNodeProps>({
  nodes,
  toggleNodeOpen,
}: {
  nodes: TreeNode<TData, TProps>[];
  toggleNodeOpen: (nodeId: number | string) => void;
}) => {
  return (
    <ul className="tree-list">
      {nodes.map((node) => (
        <li key={node.id} className="tree-item">
          {/* Render node title */}
          <div onClick={() => toggleNodeOpen(node.id)} className="tree-node">
            <span className="toggle-icon">{node.props.isOpen ? "-" : "+"}</span>
            <span className="node-title">{node.title}</span>
          </div>
          {/* Recursively render children if node is open */}
          {node.props.isOpen && node.childrens && (
            <TreeView nodes={node.childrens} toggleNodeOpen={toggleNodeOpen} />
          )}
        </li>
      ))}
    </ul>
  );
};

const TreeComponent: React.FC = () => {
  const treeOptions: ToTreeOptions<(typeof data)[0], BaseNodeProps> = {
    idKey: "id",
    titleKey: "name",
    childsKey: "employees",
  };

  // Initialize the tree hook
  const { tree, setNodeProps } = useTree(data, treeOptions);

  // Toggle node open/closed
  const toggleNodeOpen = (nodeId: number | string) => {
    setNodeProps(nodeId, ({ props }) => ({
      ...props,
      isOpen: !props.isOpen,
    }));
  };

  return (
    <div className="tree-container">
      {/* Render the tree view recursively */}
      <TreeView nodes={tree} toggleNodeOpen={toggleNodeOpen} />
    </div>
  );
};

export default TreeComponent;
