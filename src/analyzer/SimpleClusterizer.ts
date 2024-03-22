

type DataPoint<T> = {
    value: number;
    assocData: T;
}

type Cluster<T> = {
    center: number;
    assocData: DataPoint<T>[];
}

export default class SimpleClusterizer<T>{
    dataToCluster: DataPoint<T>[] = [];
    clusters: Cluster<T>[] = [];
    clusterBreakDistance = 1;
    add(value: number, assocData: T, limit: number = 0) {
        this.dataToCluster.push({
            value,
            assocData
        });

        if (limit > 0) {
            this.limitDataLength(limit);
        }

        return this;
    }
    limitDataLength(to:number) {
        while (this.dataToCluster.length > to) {
            this.dataToCluster.shift();
        }
        return this;
    }
    updateClusters() {
        const breakDistance = this.clusterBreakDistance;
        if (this.dataToCluster.length === 0) {
            return this;
        }
        this.clusters = [{
            center: this.dataToCluster[0].value,
            assocData: [this.dataToCluster[0]]
        }];
        this.dataToCluster.forEach((dataPoint) => {
            // start with arbitrart cluster
            let closestCluster = this.clusters[0];
            let closestDistance = Math.abs(dataPoint.value - closestCluster.center);

            // find a closer one
            this.clusters.forEach((cluster) => {
                const distance = Math.abs(dataPoint.value - cluster.center);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestCluster = cluster;
                }
            });

            // if closest too far, create new cluster just for that datapoint
            if (closestDistance > breakDistance) {
                closestCluster = {
                    center: dataPoint.value,
                    assocData: []
                };
                this.clusters.push(closestCluster);
            }

            // add data to closest cluster
            closestCluster.assocData.push(dataPoint);

            // recalc cluster center value
            closestCluster.center = closestCluster.assocData.reduce((sum, { value }) => sum + value, 0) / closestCluster.assocData.length;
        });
        return this;
    }
    /**
     * @param {number} clusterBreakDistance - how long of a time difference between beat intervals constitutes a inequivalent interval (i.e. cluster)
     */
    constructor(clusterBreakDistance = 1) {
        this.clusterBreakDistance = clusterBreakDistance;
    }
}
